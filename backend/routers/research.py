from __future__ import annotations

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from middleware.auth import verify_partner_auth
from services.supabase_client import get_engagement_by_id
from services.firecrawl_service import research_company, research_contacts

logger = logging.getLogger("baxterlabs.research")

router = APIRouter(prefix="/api", tags=["research"])


def _run_async_in_background(coro):
    """Helper to run an async coroutine from a sync BackgroundTask."""
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


@router.post("/engagements/{engagement_id}/research/discovery")
async def trigger_discovery_research(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Trigger company research (Firecrawl). Runs in background."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    background_tasks.add_task(_run_async_in_background, research_company(engagement_id))
    logger.info(f"Company research triggered for engagement {engagement_id}")

    return {"message": "Company research started", "engagement_id": engagement_id}


@router.post("/engagements/{engagement_id}/research/interviews")
async def trigger_interview_research(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Trigger interview contact research (Firecrawl). Runs in background."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    background_tasks.add_task(_run_async_in_background, research_contacts(engagement_id))
    logger.info(f"Interview research triggered for engagement {engagement_id}")

    return {"message": "Interview research started", "engagement_id": engagement_id}
