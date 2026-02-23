from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import verify_partner_auth
from services.supabase_client import get_engagement_by_id

router = APIRouter(prefix="/api", tags=["research"])


@router.post("/engagements/{engagement_id}/research/discovery")
async def trigger_discovery_research(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Trigger company research (Firecrawl). Placeholder for Milestone 3."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    raise HTTPException(status_code=501, detail="Firecrawl company research — not yet implemented (Milestone 3)")


@router.post("/engagements/{engagement_id}/research/interviews")
async def trigger_interview_research(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Trigger interview contact research (Firecrawl). Placeholder for Milestone 3."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    raise HTTPException(status_code=501, detail="Firecrawl interview research — not yet implemented (Milestone 3)")
