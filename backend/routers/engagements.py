from __future__ import annotations

import asyncio
import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, update_engagement_status, log_activity
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


@router.post("/engagements/{engagement_id}/advance-phase")
async def advance_phase(engagement_id: str, notes: Optional[str] = None, user: dict = Depends(verify_partner_auth)):
    """Advance engagement to the next phase. Requires partner auth."""
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    current_phase = engagement["phase"]
    if current_phase >= 7:
        raise HTTPException(status_code=400, detail="Already at final phase")

    new_phase = current_phase + 1
    review_required = current_phase in (1, 3, 6)

    sb.table("phase_executions").insert({
        "engagement_id": engagement_id,
        "phase": current_phase,
        "notes": notes,
    }).execute()

    phase_status = f"phase_{new_phase}" if new_phase <= 6 else "debrief"
    sb.table("engagements").update({"phase": new_phase, "status": phase_status}).eq("id", engagement_id).execute()

    log_activity(engagement_id, "partner", "phase_advanced", {
        "from_phase": current_phase,
        "to_phase": new_phase,
        "notes": notes,
    })

    return {
        "success": True,
        "new_phase": new_phase,
        "review_required": review_required,
        "message": f"Advanced to phase {new_phase}." + (" Review required before proceeding." if review_required else ""),
    }
