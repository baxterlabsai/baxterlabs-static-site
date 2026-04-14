"""LinkedIn Commenting Opportunities — read-only + status PATCH endpoints.

# ============================================================================
# COWORK WRITE-BACK CONTRACT — DO NOT ADD POST/PUT/DELETE
# EXCEPTIONS:
# - PATCH /{opp_id} status update (existing)
# - PATCH /{opp_id}/draft user-edited draft persistence (P6 comment drafter)
# - POST /{opp_id}/redraft live comment regeneration (P6 comment drafter)
# Any further exceptions require explicit design review.
# ============================================================================
# commenting_opportunities rows are written exclusively by the Cowork scheduled
# task "LinkedIn Commenting Pre-Brief" via Supabase MCP (service_role key).
# 5 rows per weekday, ranked 1-5, with UNIQUE(briefing_date, rank) constraint.
# This router provides read-only access + status/draft PATCH for the dashboard.
# Added: 2026-04-06 (Scheduled Task Dashboard Write-Back handoff)
# ============================================================================
"""

from __future__ import annotations

import logging
from datetime import date as date_cls, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.commenting")

router = APIRouter(prefix="/api/commenting", tags=["commenting"])

VALID_COMMENTING_STATUSES = {"pending", "acted_on", "skipped", "saved"}


class DraftUpdate(BaseModel):
    draft_comment: str


@router.get("")
async def list_commenting_opportunities(
    date: Optional[str] = Query(None, description="YYYY-MM-DD filter"),
    days: int = Query(1, ge=1, le=30, description="Number of days back from date"),
    status: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List commenting opportunities. Default: today only."""
    sb = get_supabase()
    uid = user.get("sub")
    query = sb.table("commenting_opportunities").select("*").eq("created_by", uid)

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
    """Return today's commenting counts by status.

    Consumers:
    - DashboardLayout sidebar badge reads ``pending_count``.
    - Overview Content card reads ``acted_count`` and ``total_count``.
    """
    sb = get_supabase()
    uid = user.get("sub")
    today = date_cls.today().isoformat()
    result = (
        sb.table("commenting_opportunities")
        .select("status")
        .eq("created_by", uid)
        .eq("briefing_date", today)
        .execute()
    )
    rows = result.data or []
    return {
        "pending_count": sum(1 for r in rows if r.get("status") == "pending"),
        "acted_count": sum(1 for r in rows if r.get("status") == "acted_on"),
        "total_count": len(rows),
    }


@router.get("/{opp_id}")
async def get_commenting_opportunity(
    opp_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    uid = user.get("sub")
    result = (
        sb.table("commenting_opportunities")
        .select("*")
        .eq("id", opp_id)
        .eq("created_by", uid)
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
    uid = user.get("sub")
    update_data: dict = {"status": new_status}
    if new_status == "acted_on":
        update_data["acted_at"] = datetime.utcnow().isoformat()

    result = (
        sb.table("commenting_opportunities")
        .update(update_data)
        .eq("id", opp_id)
        .eq("created_by", uid)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Commenting opportunity not found")
    return result.data[0]


@router.patch("/{opp_id}/draft")
async def update_draft(
    opp_id: str,
    body: DraftUpdate,
    user: dict = Depends(verify_partner_auth),
):
    """Persist user edits to a comment draft.

    Called by the Commenting page Save Edits button on the draft block.
    Writes draft_comment and bumps draft_generated_at. Does NOT touch status,
    acted_at, or any other column.
    """
    sb = get_supabase()
    uid = user.get("sub")

    # Validate the row exists and belongs to the caller
    check = (
        sb.table("commenting_opportunities")
        .select("id")
        .eq("id", opp_id)
        .eq("created_by", uid)
        .execute()
    )
    if not check.data:
        raise HTTPException(404, "Commenting opportunity not found")

    result = (
        sb.table("commenting_opportunities")
        .update({
            "draft_comment": body.draft_comment,
            "draft_generated_at": datetime.utcnow().isoformat(),
        })
        .eq("id", opp_id)
        .eq("created_by", uid)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Commenting opportunity not found")
    return result.data[0]


@router.post("/{opp_id}/redraft")
async def redraft(
    opp_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Regenerate a comment draft from scratch using the live comment drafter service.

    Called by the Commenting page Redraft button on the draft block.
    Overwrites draft_comment with a freshly generated draft and bumps
    draft_generated_at. Does NOT touch status, acted_at, or any other column.

    This is the live path (Architecture 1 from P6 design). The scheduled task
    batch path uses a Cowork skill that mirrors this logic.
    """
    from services.comment_drafter import (
        CommentDraftError,
        DriveReadError,
        draft_comment_for_opportunity,
    )

    try:
        result = draft_comment_for_opportunity(opp_id)
    except DriveReadError as e:
        logger.exception("DriveReadError during redraft for opp %s", opp_id)
        raise HTTPException(
            status_code=503,
            detail=f"Brand voice or prompt template unavailable: {e}",
        )
    except CommentDraftError as e:
        logger.exception("CommentDraftError during redraft for opp %s", opp_id)
        raise HTTPException(status_code=404, detail=str(e))

    # Re-fetch the row so we return the same shape as PATCH /{opp_id}
    sb = get_supabase()
    uid = user.get("sub")
    row = (
        sb.table("commenting_opportunities")
        .select("*")
        .eq("id", opp_id)
        .eq("created_by", uid)
        .execute()
    )
    if not row.data:
        raise HTTPException(404, "Commenting opportunity not found")
    return row.data[0]
