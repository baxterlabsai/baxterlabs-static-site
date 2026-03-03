from __future__ import annotations

import asyncio
import logging
import os
import re as _re
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, update_engagement_status, log_activity
from services.email_service import get_email_service
from services.docusign_service import get_docusign_service
from services.firecrawl_service import research_contacts

logger = logging.getLogger("baxterlabs.engagements")

router = APIRouter(prefix="/api", tags=["engagements"])


def _run_async_in_background(coro):
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


@router.get("/engagements")
async def list_engagements(
    user: dict = Depends(verify_partner_auth),
    include_deleted: bool = False,
):
    """List all engagements with client info. Requires partner auth.
    Excludes soft-deleted engagements by default."""
    sb = get_supabase()
    query = sb.table("engagements").select("*, clients(*)")
    if not include_deleted:
        query = query.eq("is_deleted", False)
    result = query.order("created_at", desc=True).execute()
    return {"engagements": result.data, "count": len(result.data)}


@router.get("/engagements/summary")
async def list_engagements_summary(user: dict = Depends(verify_partner_auth)):
    """Lightweight list of engagements with just id, company name, and status.
    Used for referral attribution dropdowns."""
    sb = get_supabase()
    result = (
        sb.table("engagements")
        .select("id, status, clients(company_name)")
        .eq("is_deleted", False)
        .order("created_at", desc=True)
        .execute()
    )
    return {
        "engagements": [
            {
                "id": e["id"],
                "status": e["status"],
                "company_name": e.get("clients", {}).get("company_name") if e.get("clients") else None,
            }
            for e in result.data
        ],
    }


@router.get("/engagements/{engagement_id}")
async def get_engagement(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Get full engagement detail with all related data. Requires partner auth."""
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    contacts = sb.table("interview_contacts").select("*").eq("engagement_id", engagement_id).order("contact_number").execute()
    legal = sb.table("legal_documents").select("*").eq("engagement_id", engagement_id).execute()
    docs = sb.table("documents").select("*").eq("engagement_id", engagement_id).execute()
    research = sb.table("research_documents").select("*").eq("engagement_id", engagement_id).execute()
    deliverables_result = sb.table("deliverables").select("*").eq("engagement_id", engagement_id).execute()
    phase_outputs_result = sb.table("phase_outputs").select("*").eq("engagement_id", engagement_id).order("phase").order("output_number").execute()
    activity = sb.table("activity_log").select("*").eq("engagement_id", engagement_id).order("created_at", desc=True).limit(50).execute()

    return {
        **engagement,
        "interview_contacts": contacts.data,
        "legal_documents": legal.data,
        "documents": docs.data,
        "research_documents": research.data,
        "deliverables": deliverables_result.data,
        "phase_outputs": phase_outputs_result.data,
        "activity_log": activity.data,
    }


class StartEngagementInput(BaseModel):
    fee: Optional[float] = 12500
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    partner_lead: Optional[str] = "George DeVries"
    discovery_notes: Optional[str] = None


@router.post("/engagements/{engagement_id}/start")
async def start_engagement(
    engagement_id: str,
    body: StartEngagementInput,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Start Engagement — update fields, send agreement via DocuSign, trigger interview research."""
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("nda_signed", "discovery_done"):
        raise HTTPException(status_code=400, detail=f"Cannot start engagement in status '{engagement['status']}'")

    # 1. Update engagement fields
    update_data = {
        "fee": body.fee,
        "partner_lead": body.partner_lead,
        "status": "agreement_pending",
    }
    if body.start_date:
        update_data["start_date"] = body.start_date
    if body.target_end_date:
        update_data["target_end_date"] = body.target_end_date
    if body.discovery_notes:
        update_data["discovery_notes"] = body.discovery_notes

    sb.table("engagements").update(update_data).eq("id", engagement_id).execute()

    # 2. Send Engagement Agreement via DocuSign (non-blocking on failure)
    client = engagement.get("clients", {})
    agreement_sent = False
    try:
        ds = get_docusign_service()
        if ds._is_configured():
            result = ds.send_agreement(
                engagement_id=engagement_id,
                contact_email=client.get("primary_contact_email", ""),
                contact_name=client.get("primary_contact_name", ""),
                company_name=client.get("company_name", ""),
                fee=body.fee or 12500,
                start_date=body.start_date or "TBD",
                end_date=body.target_end_date or "14 days from start",
            )
            if result.get("success"):
                sb.table("legal_documents").insert({
                    "engagement_id": engagement_id,
                    "type": "agreement",
                    "docusign_envelope_id": result["envelope_id"],
                    "status": "sent",
                    "sent_at": "now()",
                }).execute()
                agreement_sent = True
                logger.info(f"Agreement sent for engagement {engagement_id}")
    except Exception as e:
        logger.warning(f"DocuSign agreement send failed (non-blocking): {e}")

    # 3. Trigger interview research in background
    background_tasks.add_task(_run_async_in_background, research_contacts(engagement_id))

    # 4. Log activity
    log_activity(engagement_id, "partner", "engagement_started", {
        "fee": body.fee,
        "partner_lead": body.partner_lead,
        "agreement_sent": agreement_sent,
    })

    return {
        "success": True,
        "agreement_sent": agreement_sent,
        "message": "Engagement started. Agreement sent and interview research triggered.",
    }


PHASE_STATUSES = {
    0: "phase_1",
    1: "phase_2",
    2: "phase_3",
    3: "phase_4",
    4: "phase_5",
    5: "phase_6",
    6: "phase_7",
    7: "phases_complete",
}

REVIEW_GATE_PHASES = {1, 3, 6}

ACTIVE_PHASE_STATUSES = {f"phase_{i}" for i in range(8)}


class AdvancePhaseInput(BaseModel):
    notes: Optional[str] = None
    review_confirmed: bool = False


@router.post("/engagements/{engagement_id}/advance-phase")
async def advance_phase(
    engagement_id: str,
    body: AdvancePhaseInput,
    user: dict = Depends(verify_partner_auth),
):
    """Advance engagement to the next phase. Requires partner auth.

    Review gate phases (1, 3, 6) require explicit review_confirmed=True
    before the phase will advance.
    """
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Ensure the engagement is in an active phase status
    if engagement["status"] not in ACTIVE_PHASE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Engagement is not in an active phase (current status: '{engagement['status']}')",
        )

    current_phase: int = engagement["phase"]
    if current_phase > 7:
        raise HTTPException(status_code=400, detail="All phases are already complete")

    # Review gate check — phases 1, 3, 6 require explicit confirmation
    if current_phase in REVIEW_GATE_PHASES and not body.review_confirmed:
        return JSONResponse(
            status_code=200,
            content={
                "review_required": True,
                "message": (
                    f"Phase {current_phase} is a review gate. "
                    "Please confirm the review before advancing."
                ),
            },
        )

    # Phase output acceptance check — review gate phases require all outputs accepted
    if current_phase in REVIEW_GATE_PHASES:
        phase_outputs = (
            sb.table("phase_outputs")
            .select("id, status")
            .eq("engagement_id", engagement_id)
            .eq("phase", current_phase)
            .execute()
        )
        if phase_outputs.data:
            unaccepted = [o for o in phase_outputs.data if o["status"] != "accepted"]
            if unaccepted:
                return JSONResponse(
                    status_code=200,
                    content={
                        "outputs_not_accepted": True,
                        "unaccepted_count": len(unaccepted),
                        "message": (
                            f"All Phase {current_phase} outputs must be accepted before advancing. "
                            f"{len(unaccepted)} output(s) still pending review."
                        ),
                    },
                )

    # Look up the current active prompt version for this phase
    prompt_version: Optional[str] = None
    try:
        prompt_result = (
            sb.table("phase_prompts")
            .select("version")
            .eq("phase", current_phase)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        if prompt_result.data:
            prompt_version = prompt_result.data[0]["version"]
    except Exception as e:
        logger.warning(f"Could not fetch prompt version for phase {current_phase}: {e}")

    # Create phase_execution record
    sb.table("phase_executions").insert({
        "engagement_id": engagement_id,
        "phase": current_phase,
        "prompt_version": prompt_version,
        "notes": body.notes,
    }).execute()

    # Determine next status
    new_status = PHASE_STATUSES.get(current_phase, "phases_complete")
    # Keep phase capped at 7 (DB constraint: 0-7)
    new_phase = min(current_phase + 1, 7)

    # Update engagement
    sb.table("engagements").update({
        "phase": new_phase,
        "status": new_status,
    }).eq("id", engagement_id).execute()

    # Log activity
    log_activity(engagement_id, "partner", "phase_advanced", {
        "from_phase": current_phase,
        "to_phase": new_phase,
        "new_status": new_status,
        "prompt_version": prompt_version,
        "notes": body.notes,
    })

    # Trigger final invoice when all phases complete
    if new_status == "phases_complete":
        try:
            from routers.invoices import create_and_send_invoice
            create_and_send_invoice(
                engagement_id=engagement_id,
                invoice_type="final",
                send_email=True,
            )
            logger.info(f"Final invoice triggered for engagement {engagement_id}")
        except Exception as inv_err:
            logger.error(f"Final invoice generation failed (non-blocking): {inv_err}")

    return {
        "success": True,
        "from_phase": current_phase,
        "new_phase": new_phase,
        "new_status": new_status,
        "prompt_version": prompt_version,
        "message": f"Advanced from phase {current_phase} to phase {new_phase} ({new_status}).",
    }


@router.post("/engagements/{engagement_id}/begin-phases")
async def begin_phases(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Start Phase 0 for an engagement that has received all documents.

    The engagement must be in 'documents_received' status.
    """
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] != "documents_received":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot begin phases — engagement status is '{engagement['status']}', expected 'documents_received'",
        )

    # Update engagement to phase_0
    sb.table("engagements").update({
        "status": "phase_0",
        "phase": 0,
    }).eq("id", engagement_id).execute()

    # Create phase_execution record for phase 0
    sb.table("phase_executions").insert({
        "engagement_id": engagement_id,
        "phase": 0,
    }).execute()

    # Log activity
    log_activity(engagement_id, "partner", "phases_began", {
        "phase": 0,
        "status": "phase_0",
    })

    # Re-fetch the updated engagement
    updated = get_engagement_by_id(engagement_id)

    return {
        "success": True,
        "message": "Began Phase 0. The engagement is now in active phase execution.",
        "engagement": updated,
    }


@router.post("/engagements/{engagement_id}/send-upload-link")
async def send_upload_link(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Send (or resend) the upload portal link to the client. Requires partner auth."""
    import uuid as _uuid

    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Generate upload_token on the fly if missing (legacy engagements)
    if not engagement.get("upload_token"):
        new_token = str(_uuid.uuid4())
        sb.table("engagements").update({"upload_token": new_token}).eq("id", engagement_id).execute()
        engagement["upload_token"] = new_token
        logger.info(f"Generated upload_token for engagement {engagement_id}: {new_token}")

    email_svc = get_email_service()
    result = email_svc.send_upload_link(engagement)

    log_activity(engagement_id, "partner", "upload_link_sent", {
        "to": engagement.get("clients", {}).get("primary_contact_email"),
        "upload_token": engagement.get("upload_token"),
        "email_result": result,
    })

    return {"success": True, "email_result": result}


class InterviewContactUpdate(BaseModel):
    enrichment_data: Optional[dict] = None
    call_notes_doc_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Interview Transcript Upload / Download
# ---------------------------------------------------------------------------

TRANSCRIPT_EXTENSIONS = {".docx", ".doc", ".pdf", ".txt", ".md", ".rtf"}
TRANSCRIPT_MAX_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/engagements/{engagement_id}/contacts/{contact_id}/transcript")
async def upload_interview_transcript(
    engagement_id: str,
    contact_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_partner_auth),
):
    """Upload an interview transcript for an engagement contact."""
    sb = get_supabase()

    # Verify engagement exists
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Verify contact belongs to engagement
    contact_result = (
        sb.table("interview_contacts")
        .select("id, name, title, engagement_id, transcript_document_id")
        .eq("id", contact_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not contact_result.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact = contact_result.data[0]

    # Validate file
    filename = file.filename or "transcript"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in TRANSCRIPT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(sorted(TRANSCRIPT_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > TRANSCRIPT_MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit.")

    # Build storage path
    name_slug = _re.sub(r'[^a-z0-9]+', '_', contact["name"].lower()).strip('_')
    timestamp = int(datetime.now(timezone.utc).timestamp())
    storage_path = f"{engagement_id}/interviews/{name_slug}_{timestamp}{ext}"

    # Delete old transcript if replacing
    old_doc_id = contact.get("transcript_document_id")
    if old_doc_id:
        old_doc = sb.table("documents").select("storage_path").eq("id", old_doc_id).execute()
        if old_doc.data:
            try:
                sb.storage.from_("engagements").remove([old_doc.data[0]["storage_path"]])
            except Exception as e:
                logger.warning(f"Failed to delete old transcript file: {e}")
            sb.table("documents").delete().eq("id", old_doc_id).execute()

    # Upload to storage
    sb.storage.from_("engagements").upload(
        storage_path, content, {"content-type": file.content_type or "application/octet-stream"}
    )

    # Create documents record
    doc_result = sb.table("documents").insert({
        "engagement_id": engagement_id,
        "category": "transcript",
        "filename": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "document_type": "interview_transcript",
        "uploaded_by": "analyst",
        "storage_bucket": "engagements",
        "status": "uploaded",
    }).execute()

    doc_id = doc_result.data[0]["id"]

    # Update interview_contacts.transcript_document_id
    sb.table("interview_contacts").update({
        "transcript_document_id": doc_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", contact_id).execute()

    # Fold intelligence back into pipeline_companies via converted_engagement_id
    try:
        opp_result = (
            sb.table("pipeline_opportunities")
            .select("company_id")
            .eq("converted_engagement_id", engagement_id)
            .eq("is_deleted", False)
            .execute()
        )
        if opp_result.data:
            co_id = opp_result.data[0]["company_id"]
            co_result = (
                sb.table("pipeline_companies")
                .select("id, enrichment_data")
                .eq("id", co_id)
                .execute()
            )
            if co_result.data:
                co = co_result.data[0]
                co_ed = co.get("enrichment_data") or {}
                intel_list = co_ed.get("interview_intelligence", [])
                intel_list.append({
                    "contact_name": contact["name"],
                    "contact_title": contact.get("title"),
                    "engagement_id": engagement_id,
                    "document_id": doc_id,
                    "storage_path": storage_path,
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "summary": None,
                })
                co_ed["interview_intelligence"] = intel_list
                sb.table("pipeline_companies").update({
                    "enrichment_data": co_ed,
                }).eq("id", co_id).execute()
    except Exception as e:
        logger.warning(f"Intelligence fold-back failed (non-blocking): {e}")

    # Log activity
    log_activity(engagement_id, "analyst", "interview_transcript_uploaded", {
        "contact_id": contact_id,
        "contact_name": contact["name"],
        "filename": filename,
        "document_id": doc_id,
    })

    # Return updated contact
    updated = (
        sb.table("interview_contacts")
        .select("*")
        .eq("id", contact_id)
        .execute()
    )
    return updated.data[0]


@router.get("/engagements/{engagement_id}/contacts/{contact_id}/transcript/download")
async def download_interview_transcript(
    engagement_id: str,
    contact_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Generate a signed download URL for a contact's interview transcript."""
    sb = get_supabase()

    contact = (
        sb.table("interview_contacts")
        .select("transcript_document_id")
        .eq("id", contact_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    doc_id = contact.data[0].get("transcript_document_id")
    if not doc_id:
        raise HTTPException(status_code=404, detail="No transcript uploaded for this contact")

    doc = sb.table("documents").select("storage_path, filename").eq("id", doc_id).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Transcript document not found")

    storage_path = doc.data[0]["storage_path"]

    try:
        signed = sb.storage.from_("engagements").create_signed_url(storage_path, 3600)
        return {
            "success": True,
            "url": signed.get("signedURL") or signed.get("signedUrl", ""),
            "filename": doc.data[0]["filename"],
        }
    except Exception as e:
        logger.error(f"Failed to create signed URL for transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")


@router.get("/engagements/{engagement_id}/contacts/{contact_id}")
async def get_interview_contact(
    engagement_id: str,
    contact_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Get a single interview contact with all fields."""
    sb = get_supabase()
    result = (
        sb.table("interview_contacts")
        .select("*")
        .eq("id", contact_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return result.data[0]


@router.patch("/engagements/{engagement_id}/contacts/{contact_id}")
async def update_interview_contact(
    engagement_id: str,
    contact_id: str,
    body: InterviewContactUpdate,
    user: dict = Depends(verify_partner_auth),
):
    """Update enrichment_data or call_notes_doc_url on an interview contact."""
    sb = get_supabase()

    # Verify contact belongs to engagement
    existing = (
        sb.table("interview_contacts")
        .select("id")
        .eq("id", contact_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        sb.table("interview_contacts")
        .update(updates)
        .eq("id", contact_id)
        .execute()
    )
    return result.data[0]


@router.get("/engagements/{engagement_id}/documents/{doc_id}/download")
async def download_document(engagement_id: str, doc_id: str, user: dict = Depends(verify_partner_auth)):
    """Generate a signed download URL for a document. Requires partner auth."""
    sb = get_supabase()

    doc_result = (
        sb.table("documents")
        .select("*")
        .eq("id", doc_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )

    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = doc_result.data[0]
    storage_path = doc["storage_path"]

    try:
        signed = sb.storage.from_("engagements").create_signed_url(storage_path, 3600)
        return {"success": True, "url": signed.get("signedURL") or signed.get("signedUrl", ""), "filename": doc["filename"]}
    except Exception as e:
        logger.error(f"Failed to create signed URL for {storage_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")
