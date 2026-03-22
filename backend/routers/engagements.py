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
from services.research_service import research_contacts
from services.transcript_service import extract_text, analyze_transcript, get_transcript_intelligence
from services.google_drive_engagement import upload_file_to_drive_folder, delete_drive_file

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
    """Start Engagement — update fields and send agreement via DocuSign."""
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("discovery_done",):
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

    # 3. Interview briefs now triggered at Phase 1 completion, not here.

    # 4. Log activity
    log_activity(engagement_id, "partner", "engagement_started", {
        "fee": body.fee,
        "partner_lead": body.partner_lead,
        "agreement_sent": agreement_sent,
    })

    return {
        "success": True,
        "agreement_sent": agreement_sent,
        "message": "Engagement started. Agreement sent.",
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
    background_tasks: BackgroundTasks,
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

    # Trigger interview brief generation when Phase 1 completes (advancing from phase 1 → phase 2)
    if current_phase == 1:
        try:
            phase1_content = None
            findings_result = (
                sb.table("research_documents")
                .select("content")
                .eq("engagement_id", engagement_id)
                .eq("type", "preliminary_findings_memo")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if findings_result.data:
                phase1_content = findings_result.data[0]["content"]
            background_tasks.add_task(
                _run_async_in_background,
                research_contacts(engagement_id, phase1_findings=phase1_content),
            )
            logger.info(
                f"Interview brief generation triggered on Phase 1 completion for {engagement_id} "
                f"(phase1_findings={'available' if phase1_content else 'not available'})"
            )
        except Exception as e:
            logger.error(f"Interview brief trigger failed (non-blocking): {e}")

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
    transcript_gdrive_url: Optional[str] = None
    prep_source_phase_output_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Interview Transcript Upload / Download
# ---------------------------------------------------------------------------

TRANSCRIPT_EXTENSIONS = {".docx", ".doc", ".pdf", ".txt", ".md", ".rtf"}
TRANSCRIPT_MAX_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/engagements/{engagement_id}/contacts/{contact_id}/transcript")
async def upload_interview_transcript(
    engagement_id: str,
    contact_id: str,
    background_tasks: BackgroundTasks,
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
        old_doc = sb.table("documents").select("storage_path, storage_backend").eq("id", old_doc_id).execute()
        if old_doc.data:
            try:
                if old_doc.data[0].get("storage_backend") == "drive":
                    await delete_drive_file(old_doc.data[0]["storage_path"])
                else:
                    sb.storage.from_("engagements").remove([old_doc.data[0]["storage_path"]])
            except Exception as e:
                logger.warning(f"Failed to delete old transcript file: {e}")
            sb.table("documents").delete().eq("id", old_doc_id).execute()

    # Upload to Drive or Supabase Storage
    drive_interviews_folder_id = engagement.get("drive_interviews_folder_id")
    mimetype = file.content_type or "application/octet-stream"

    if drive_interviews_folder_id:
        drive_file_id = await upload_file_to_drive_folder(
            folder_id=drive_interviews_folder_id,
            filename=f"{name_slug}_{timestamp}{ext}",
            file_bytes=content,
            mimetype=mimetype,
        )
        if not drive_file_id:
            raise HTTPException(status_code=502, detail="Failed to upload transcript to Google Drive.")

        doc_result = sb.table("documents").insert({
            "engagement_id": engagement_id,
            "category": "transcript",
            "filename": filename,
            "storage_path": drive_file_id,
            "file_size": len(content),
            "document_type": "interview_transcript",
            "uploaded_by": "analyst",
            "storage_backend": "drive",
            "status": "uploaded",
        }).execute()
    else:
        sb.storage.from_("engagements").upload(
            storage_path, content, {"content-type": mimetype}
        )

        doc_result = sb.table("documents").insert({
            "engagement_id": engagement_id,
            "category": "transcript",
            "filename": filename,
            "storage_path": storage_path,
            "file_size": len(content),
            "document_type": "interview_transcript",
            "uploaded_by": "analyst",
            "storage_bucket": "engagements",
            "storage_backend": "supabase",
            "status": "uploaded",
        }).execute()

    doc_id = doc_result.data[0]["id"]

    # Extract text content from the file
    extracted = extract_text(content, ext)
    if extracted:
        sb.table("documents").update({"extracted_text": extracted}).eq("id", doc_id).execute()
        logger.info(f"Transcript text extracted — doc={doc_id} chars={len(extracted)}")

        # Trigger LLM analysis in background
        company_name = engagement.get("clients", {}).get("company_name", "Unknown")
        background_tasks.add_task(
            analyze_transcript, doc_id, engagement_id,
            contact["name"], contact.get("title"), company_name,
        )
    else:
        logger.warning(f"Text extraction returned nothing for {filename} ({ext})")

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


class GDocTranscriptRequest(BaseModel):
    gdoc_url: str


@router.post("/engagements/{engagement_id}/contacts/{contact_id}/transcript-gdoc")
async def upload_interview_transcript_gdoc(
    engagement_id: str,
    contact_id: str,
    background_tasks: BackgroundTasks,
    body: GDocTranscriptRequest,
    user: dict = Depends(verify_partner_auth),
):
    """Import an interview transcript from a Google Doc URL."""
    from services.google_drive_service import fetch_google_doc_text

    if not body.gdoc_url.startswith("https://docs.google.com/document/d/"):
        raise HTTPException(status_code=422, detail="URL must be a Google Docs URL (https://docs.google.com/document/d/...)")

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

    # Fetch Google Doc content via Drive API (OAuth credentials)
    try:
        extracted_text = fetch_google_doc_text(body.gdoc_url)
    except Exception as e:
        logger.error(f"Google Doc fetch failed for {body.gdoc_url}: {e}")
        raise HTTPException(
            status_code=422,
            detail=f"Could not access this Google Doc: {e}",
        )

    if not extracted_text or not extracted_text.strip():
        raise HTTPException(status_code=422, detail="The Google Doc appears to be empty.")

    # Extract doc ID for filename
    import re as _re_gdoc
    doc_id_match = _re_gdoc.search(r'/document/d/([a-zA-Z0-9_-]+)', body.gdoc_url)
    doc_id_str = doc_id_match.group(1) if doc_id_match else "unknown"
    filename = f"Google Doc — {doc_id_str[:60]}.gdoc"

    # Delete old transcript if replacing
    old_doc_id = contact.get("transcript_document_id")
    if old_doc_id:
        old_doc = sb.table("documents").select("storage_path").eq("id", old_doc_id).execute()
        if old_doc.data and old_doc.data[0].get("storage_path"):
            try:
                sb.storage.from_("engagements").remove([old_doc.data[0]["storage_path"]])
            except Exception as e:
                logger.warning(f"Failed to delete old transcript file: {e}")
        sb.table("documents").delete().eq("id", old_doc_id).execute()

    # Create documents record (no file in storage — source is GDoc)
    doc_result = sb.table("documents").insert({
        "engagement_id": engagement_id,
        "category": "transcript",
        "filename": filename,
        "storage_path": None,
        "file_size": len(extracted_text.encode("utf-8")),
        "document_type": "interview_transcript",
        "uploaded_by": "analyst",
        "storage_bucket": "engagements",
        "status": "uploaded",
        "extracted_text": extracted_text,
        "gdoc_url": body.gdoc_url,
    }).execute()

    doc_id = doc_result.data[0]["id"]
    logger.info(f"GDoc transcript imported — doc={doc_id} chars={len(extracted_text)}")

    # Trigger LLM analysis in background
    company_name = engagement.get("clients", {}).get("company_name", "Unknown")
    background_tasks.add_task(
        analyze_transcript, doc_id, engagement_id,
        contact["name"], contact.get("title"), company_name,
    )

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
                    "storage_path": None,
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "summary": None,
                    "google_doc_url": body.gdoc_url,
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
        "source": "google_doc",
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


# ---------------------------------------------------------------------------
# Transcript Intelligence
# ---------------------------------------------------------------------------


@router.get("/engagements/{engagement_id}/transcript-intelligence")
async def transcript_intelligence_endpoint(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Return all analyzed transcript summaries and citations for an engagement."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return get_transcript_intelligence(engagement_id)


# ---------------------------------------------------------------------------
# Agreement View / Download (signed PDF from Supabase storage)
# ---------------------------------------------------------------------------


@router.get("/engagements/{engagement_id}/agreements/{document_id}/view")
async def view_agreement(
    engagement_id: str,
    document_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Generate a short-lived signed URL for inline PDF viewing."""
    sb = get_supabase()
    doc = (
        sb.table("legal_documents")
        .select("signed_pdf_path")
        .eq("id", document_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not doc.data or not doc.data[0].get("signed_pdf_path"):
        raise HTTPException(status_code=404, detail="Signed agreement not found")

    storage_path = doc.data[0]["signed_pdf_path"]
    try:
        signed = sb.storage.from_("engagements").create_signed_url(storage_path, 3600)
        return {
            "success": True,
            "url": signed.get("signedURL") or signed.get("signedUrl", ""),
        }
    except Exception as e:
        logger.error(f"Failed to create signed URL for agreement: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate view link")


@router.get("/engagements/{engagement_id}/agreements/{document_id}/download")
async def download_agreement(
    engagement_id: str,
    document_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Generate a signed URL with content-disposition: attachment for download."""
    sb = get_supabase()
    doc = (
        sb.table("legal_documents")
        .select("signed_pdf_path")
        .eq("id", document_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not doc.data or not doc.data[0].get("signed_pdf_path"):
        raise HTTPException(status_code=404, detail="Signed agreement not found")

    storage_path = doc.data[0]["signed_pdf_path"]
    try:
        signed = sb.storage.from_("engagements").create_signed_url(
            storage_path, 3600, {"download": "signed-agreement.pdf"},
        )
        return {
            "success": True,
            "url": signed.get("signedURL") or signed.get("signedUrl", ""),
            "filename": "signed-agreement.pdf",
        }
    except Exception as e:
        logger.error(f"Failed to create download URL for agreement: {e}")
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


@router.get("/engagements/{engagement_id}/contact-research")
async def get_contact_research(
    engagement_id: str,
    contact_name: str,
    user: dict = Depends(verify_partner_auth),
):
    """Get contact research document for a specific contact."""
    sb = get_supabase()
    result = (
        sb.table("research_documents")
        .select("id, type, contact_name, title, content, source, created_at")
        .eq("engagement_id", engagement_id)
        .eq("type", "contact_research")
        .ilike("contact_name", f"%{contact_name}%")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return {"document": result.data[0] if result.data else None}


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


@router.post("/engagements/{engagement_id}/send-onboarding-email")
async def send_onboarding_email(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """(Re)send the onboarding welcome email to the primary contact."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    onboarding_token = engagement.get("onboarding_token")
    if not onboarding_token:
        raise HTTPException(status_code=400, detail="No onboarding token set on this engagement")

    client = engagement.get("clients", {})
    contact_email = client.get("primary_contact_email")
    if not contact_email:
        raise HTTPException(status_code=400, detail="No primary contact email on this engagement")

    email_svc = get_email_service()
    result = email_svc.send_engagement_confirmation_email(
        engagement=engagement,
        client=client,
        onboarding_token=onboarding_token,
    )

    log_activity(engagement_id, "system", "onboarding_email_sent", {
        "trigger": "manual_resend",
        "to": contact_email,
        "result": result,
    })

    return {"status": "sent", "recipient": contact_email}


class ResendInterviewEmailBody(BaseModel):
    contact_id: str
    contact_name: str
    contact_email: str


@router.post("/engagements/{engagement_id}/resend-interview-email")
async def resend_interview_email(
    engagement_id: str,
    body: ResendInterviewEmailBody,
    user: dict = Depends(verify_partner_auth),
):
    """Resend the interview scheduling email to a specific contact."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    client = engagement.get("clients", {})
    company_name = client.get("company_name", "Unknown")
    partner_lead = engagement.get("partner_lead", "George DeVries")

    email_svc = get_email_service()
    result = email_svc.send_interview_scheduling_email(
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        client_company_name=company_name,
        partner_lead=partner_lead,
    )

    log_activity(engagement_id, "george", "interview_email_resent", {
        "contact_name": body.contact_name,
        "contact_email": body.contact_email,
    })

    return {"status": "sent", "recipient": body.contact_email}
