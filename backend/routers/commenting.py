"""LinkedIn Commenting Opportunities — read-only + status PATCH endpoints.

# ============================================================================
# COWORK WRITE-BACK CONTRACT — DO NOT ADD POST/PUT/DELETE (except PATCH status)
# ============================================================================
# commenting_opportunities rows are written exclusively by the Cowork scheduled
# task "LinkedIn Commenting Pre-Brief" via Supabase MCP (service_role key).
# 5 rows per weekday, ranked 1-5, with UNIQUE(briefing_date, rank) constraint.
# This router provides read-only access + status PATCH for the dashboard.
# Added: 2026-04-06 (Scheduled Task Dashboard Write-Back handoff)
# ============================================================================
"""

from __future__ import annotations

import logging
from datetime import date as date_cls, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.commenting")

router = APIRouter(prefix="/api/commenting", tags=["commenting"])

VALID_COMMENTING_STATUSES = {"pending", "acted_on", "skipped", "saved"}


@router.get("")
async def list_commenting_opportunities(
    date: Optional[str] = Query(None, description="YYYY-MM-DD filter"),
    days: int = Query(1, ge=1, le=30, description="Number of days back from date"),
    status: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List commenting opportunities. Default: today only."""
    sb = get_supabase()
    query = sb.table("commenting_opportunities").select("*")

    target = date if date else date_cls.today().isoformat()

    if days == 1:
        query = query.eq("briefing_date", target)
    else:
        end = date_cls.fromisoformat(target)
        start = end - timedelta(days=days - 1)
        query = query.gte("briefing_date", start.isoformat()).lte("briefing_date", target)

    if status:
        if status not in VALID_COMMENTING_STATUSES:
            raise HTTPException(400, f"Invalid status: {status}")
        query = query.eq("status", status)

    query = query.order("briefing_date", desc=True).order("rank", desc=False)
    result = query.execute()
    return result.data


@router.get("/stats")
async def commenting_stats(
    user: dict = Depends(verify_partner_auth),
):
    """Return today's pending count for sidebar badge."""
    sb = get_supabase()
    today = date_cls.today().isoformat()
    result = (
        sb.table("commenting_opportunities")
        .select("id")
        .eq("briefing_date", today)
        .eq("status", "pending")
        .execute()
    )
    return {"pending_count": len(result.data)}


@router.get("/{opp_id}")
async def get_commenting_opportunity(
    opp_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = (
        sb.table("commenting_opportunities")
        .select("*")
        .eq("id", opp_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Commenting opportunity not found")
    return result.data[0]


@router.patch("/{opp_id}")
async def update_commenting_status(
    opp_id: str,
    payload: dict,
    user: dict = Depends(verify_partner_auth),
):
    """Update status of a commenting opportunity (acted_on/skipped/saved)."""
    new_status = payload.get("status")
    if not new_status or new_status not in VALID_COMMENTING_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {VALID_COMMENTING_STATUSES}")

    sb = get_supabase()
    update_data: dict = {"status": new_status}
    if new_status == "acted_on":
        update_data["acted_at"] = datetime.utcnow().isoformat()

    result = (
        sb.table("commenting_opportunities")
        .update(update_data)
        .eq("id", opp_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Commenting opportunity not found")
    return result.data[0]
