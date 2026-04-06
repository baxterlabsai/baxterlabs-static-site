"""Pipeline Briefings — read-only endpoints for Cowork-generated daily briefings.

# ============================================================================
# COWORK WRITE-BACK CONTRACT — DO NOT ADD POST/PUT/DELETE ENDPOINTS
# ============================================================================
# pipeline_briefings rows are written exclusively by the Cowork scheduled task
# "Pipeline Priority Briefing" via Supabase MCP (service_role key).
# This router provides read-only access for the dashboard.
# Added: 2026-04-06 (Scheduled Task Dashboard Write-Back handoff)
# ============================================================================
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.briefings")

router = APIRouter(prefix="/api/pipeline", tags=["briefings"])


@router.get("/briefings")
async def list_briefings(
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(verify_partner_auth),
):
    """Return recent pipeline briefings, newest first."""
    sb = get_supabase()
    result = (
        sb.table("pipeline_briefings")
        .select("*")
        .order("briefing_date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.get("/briefings/latest")
async def get_latest_briefing(
    user: dict = Depends(verify_partner_auth),
):
    """Return the most recent briefing (for the Morning Briefing card)."""
    sb = get_supabase()
    result = (
        sb.table("pipeline_briefings")
        .select("*")
        .order("briefing_date", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


@router.get("/briefings/{briefing_id}")
async def get_briefing(
    briefing_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = (
        sb.table("pipeline_briefings")
        .select("*")
        .eq("id", briefing_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Briefing not found")
    return result.data[0]
