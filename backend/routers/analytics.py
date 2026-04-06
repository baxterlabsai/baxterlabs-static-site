"""Weekly Metrics Rollups — read-only endpoints for Cowork-generated rollups.

# ============================================================================
# COWORK WRITE-BACK CONTRACT — DO NOT ADD POST/PUT/DELETE ENDPOINTS
# ============================================================================
# weekly_metrics_rollups rows are written exclusively by the Cowork scheduled
# task "Friday Metrics Rollup" via Supabase MCP (service_role key).
# This router provides read-only access for the dashboard.
# Added: 2026-04-06 (Scheduled Task Dashboard Write-Back handoff)
# ============================================================================
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.analytics")

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/rollups")
async def list_rollups(
    limit: int = Query(8, ge=1, le=52),
    user: dict = Depends(verify_partner_auth),
):
    """Return recent weekly rollups, newest first. Default 8 weeks."""
    sb = get_supabase()
    result = (
        sb.table("weekly_metrics_rollups")
        .select("*")
        .order("week_start", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


@router.get("/rollups/latest")
async def get_latest_rollup(
    user: dict = Depends(verify_partner_auth),
):
    """Return the most recent rollup (for the Overview card)."""
    sb = get_supabase()
    result = (
        sb.table("weekly_metrics_rollups")
        .select("*")
        .order("week_start", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


@router.get("/rollups/{rollup_id}")
async def get_rollup(
    rollup_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = (
        sb.table("weekly_metrics_rollups")
        .select("*")
        .eq("id", rollup_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Rollup not found")
    return result.data[0]
