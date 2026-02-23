from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import verify_partner_auth, verify_deliverable_token
from services.supabase_client import get_supabase, get_engagement_by_id, update_engagement_status, log_activity
from services.email_service import get_email_service

router = APIRouter(prefix="/api", tags=["deliverables"])


@router.get("/deliverables/{token}")
async def get_deliverables_by_token(token: str):
    """Get released deliverables for client portal via token."""
    engagement = await verify_deliverable_token(token)
    sb = get_supabase()

    deliverables = sb.table("deliverables").select("*").eq("engagement_id", engagement["id"]).eq("status", "released").execute()

    wave1 = [d for d in deliverables.data if d["wave"] == 1]
    wave2 = [d for d in deliverables.data if d["wave"] == 2]

    return {
        "company_name": engagement.get("clients", {}).get("company_name", ""),
        "engagement_id": engagement["id"],
        "wave_1": wave1,
        "wave_2": wave2,
    }


@router.put("/deliverables/{deliverable_id}/approve")
async def approve_deliverable(deliverable_id: str, user: dict = Depends(verify_partner_auth)):
    """Mark a deliverable as approved. Requires partner auth."""
    sb = get_supabase()
    result = sb.table("deliverables").update({
        "status": "approved",
        "approved_at": "now()",
    }).eq("id", deliverable_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    return {"success": True, "deliverable": result.data[0]}


@router.post("/engagements/{engagement_id}/release-wave1")
async def release_wave1(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Release Wave 1 deliverables to client. Requires partner auth."""
    sb = get_supabase()
    email_svc = get_email_service()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Check all Wave 1 deliverables are approved
    wave1 = sb.table("deliverables").select("*").eq("engagement_id", engagement_id).eq("wave", 1).execute()
    unapproved = [d for d in wave1.data if d["status"] != "approved"]
    if unapproved:
        raise HTTPException(status_code=400, detail=f"{len(unapproved)} Wave 1 deliverable(s) not yet approved")

    # Release all Wave 1
    for d in wave1.data:
        sb.table("deliverables").update({"status": "released", "released_at": "now()"}).eq("id", d["id"]).execute()

    update_engagement_status(engagement_id, "wave_1_released")
    log_activity(engagement_id, "partner", "wave1_released", {})
    email_svc.send_wave1_released(engagement)

    return {"success": True, "message": "Wave 1 deliverables released to client."}


@router.post("/engagements/{engagement_id}/release-deck")
async def release_deck(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Release Wave 2 (deck + retainer proposal) post-debrief. Requires partner auth."""
    sb = get_supabase()
    email_svc = get_email_service()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if not engagement.get("debrief_complete"):
        raise HTTPException(status_code=400, detail="Debrief must be marked complete before releasing Wave 2")

    wave2 = sb.table("deliverables").select("*").eq("engagement_id", engagement_id).eq("wave", 2).execute()
    unapproved = [d for d in wave2.data if d["status"] != "approved"]
    if unapproved:
        raise HTTPException(status_code=400, detail=f"{len(unapproved)} Wave 2 deliverable(s) not yet approved")

    for d in wave2.data:
        sb.table("deliverables").update({"status": "released", "released_at": "now()"}).eq("id", d["id"]).execute()

    update_engagement_status(engagement_id, "wave_2_released")
    log_activity(engagement_id, "partner", "wave2_released", {})
    email_svc.send_wave2_released(engagement)

    return {"success": True, "message": "Wave 2 deliverables released to client."}
