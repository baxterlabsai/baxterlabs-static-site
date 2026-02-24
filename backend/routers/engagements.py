from __future__ import annotations

import asyncio
import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
async def list_engagements(user: dict = Depends(verify_partner_auth)):
    """List all engagements with client info. Requires partner auth."""
    sb = get_supabase()
    result = sb.table("engagements").select("*, clients(*)").order("created_at", desc=True).execute()
    return {"engagements": result.data, "count": len(result.data)}


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
    activity = sb.table("activity_log").select("*").eq("engagement_id", engagement_id).order("created_at", desc=True).limit(20).execute()

    return {
        **engagement,
        "interview_contacts": contacts.data,
        "legal_documents": legal.data,
        "documents": docs.data,
        "research_documents": research.data,
        "deliverables": deliverables_result.data,
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
    new_phase = current_phase + 1
    new_status = PHASE_STATUSES.get(current_phase, "phases_complete")

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
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    email_svc = get_email_service()
    result = email_svc.send_upload_link(engagement)

    log_activity(engagement_id, "partner", "upload_link_sent", {
        "to": engagement.get("clients", {}).get("primary_contact_email"),
    })

    return {"success": True, "email_result": result}


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
