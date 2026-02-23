from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, update_engagement_status, log_activity

router = APIRouter(prefix="/api", tags=["engagements"])


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

    # Fetch related data
    contacts = sb.table("interview_contacts").select("*").eq("engagement_id", engagement_id).execute()
    legal = sb.table("legal_documents").select("*").eq("engagement_id", engagement_id).execute()
    docs = sb.table("documents").select("*").eq("engagement_id", engagement_id).execute()
    research = sb.table("research_documents").select("*").eq("engagement_id", engagement_id).execute()
    deliverables_result = sb.table("deliverables").select("*").eq("engagement_id", engagement_id).execute()
    activity = sb.table("activity_log").select("*").eq("engagement_id", engagement_id).order("created_at", desc=True).limit(50).execute()

    return {
        **engagement,
        "interview_contacts": contacts.data,
        "legal_documents": legal.data,
        "documents": docs.data,
        "research_documents": research.data,
        "deliverables": deliverables_result.data,
        "activity_log": activity.data,
    }


@router.post("/engagements/{engagement_id}/start")
async def start_engagement(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Start Engagement gate — sets up folders, triggers agreement + research. Requires partner auth."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("nda_signed", "discovery_done"):
        raise HTTPException(status_code=400, detail=f"Cannot start engagement in status '{engagement['status']}'")

    update_engagement_status(engagement_id, "agreement_pending")
    log_activity(engagement_id, "partner", "engagement_started", {})

    return {"success": True, "message": "Engagement started. Agreement will be sent."}


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

    # Create phase execution record
    sb.table("phase_executions").insert({
        "engagement_id": engagement_id,
        "phase": current_phase,
        "notes": notes,
    }).execute()

    # Update engagement
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
