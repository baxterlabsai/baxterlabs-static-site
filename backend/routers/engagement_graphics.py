"""Engagement Graphics Review — signed URLs + approval workflow.

Powers the Graphics Review surface on the Engagement Detail page (P8).
Provides an engagement-scoped list endpoint (with signed URLs + summary
counts) and four mutation endpoints covering approve, request-fix,
reset-to-pending, and batch approve-all.

The `approval_status` column (migration 070) is a SEPARATE workflow from
the existing `status` column. `status` tracks the generation pipeline;
`approval_status` tracks the human review workflow.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.engagement_graphics")

router = APIRouter(prefix="/api", tags=["engagement-graphics"])

SIGNED_URL_EXPIRY_SECONDS = 3600  # 1 hour
VALID_APPROVAL_STATUSES = {"pending", "approved", "fix_requested"}


# ── Helpers ─────────────────────────────────────────────────────────────────


def _signed_url_from_result(result: dict) -> Optional[str]:
    """Extract signed URL from Supabase create_signed_url response.

    Matches the helper in deliverables.py — the Supabase client library has
    flip-flopped between signedURL and signedUrl across versions.
    """
    return result.get("signedURL") or result.get("signedUrl")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _summary_for_rows(rows: list) -> dict:
    return {
        "total": len(rows),
        "pending": sum(1 for r in rows if r.get("approval_status") == "pending"),
        "approved": sum(1 for r in rows if r.get("approval_status") == "approved"),
        "fix_requested": sum(1 for r in rows if r.get("approval_status") == "fix_requested"),
    }


def _attach_signed_url(sb, row: dict) -> dict:
    """Mutate row in place to add `signed_url`. Per-row bucket (not hardcoded).

    The existing Scion rows live in the `engagement-graphics` bucket even
    though the column default is `engagements`. Always honor the row's
    storage_bucket value so future engagements can land in either.
    """
    bucket = row.get("storage_bucket") or "engagements"
    path = row.get("storage_path")
    signed_url = None
    if path:
        try:
            result = sb.storage.from_(bucket).create_signed_url(path, SIGNED_URL_EXPIRY_SECONDS)
            signed_url = _signed_url_from_result(result)
        except Exception as e:
            logger.error("Failed to sign %s/%s: %s", bucket, path, e)
    row["signed_url"] = signed_url
    return row


def _fetch_graphic_or_404(sb, graphic_id: str) -> dict:
    result = (
        sb.table("engagement_graphics")
        .select("*")
        .eq("id", graphic_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Graphic not found")
    return result.data[0]


def _update_and_return(sb, graphic_id: str, patch: dict) -> dict:
    result = (
        sb.table("engagement_graphics")
        .update(patch)
        .eq("id", graphic_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Graphic not found")
    return _attach_signed_url(sb, dict(result.data[0]))


# ── List + summary ──────────────────────────────────────────────────────────


@router.get("/engagements/{engagement_id}/graphics")
async def list_engagement_graphics(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """List all engagement_graphics rows with signed URLs + summary counts."""
    sb = get_supabase()
    result = (
        sb.table("engagement_graphics")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("chart_type", desc=False)
        .execute()
    )
    rows = result.data or []
    graphics = [_attach_signed_url(sb, dict(r)) for r in rows]
    return {
        "graphics": graphics,
        "summary": _summary_for_rows(rows),
    }


# ── Mutations ───────────────────────────────────────────────────────────────


class FixRequestBody(BaseModel):
    fix_instructions: str


@router.patch("/engagement-graphics/{graphic_id}/approve")
async def approve_graphic(
    graphic_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    _fetch_graphic_or_404(sb, graphic_id)
    return _update_and_return(
        sb,
        graphic_id,
        {
            "approval_status": "approved",
            "approved_at": _now_iso(),
            "fix_instructions": None,
            "fix_requested_at": None,
        },
    )


@router.patch("/engagement-graphics/{graphic_id}/request-fix")
async def request_fix(
    graphic_id: str,
    body: FixRequestBody,
    user: dict = Depends(verify_partner_auth),
):
    instructions = (body.fix_instructions or "").strip()
    if not instructions:
        raise HTTPException(400, "fix_instructions is required")
    sb = get_supabase()
    _fetch_graphic_or_404(sb, graphic_id)
    return _update_and_return(
        sb,
        graphic_id,
        {
            "approval_status": "fix_requested",
            "fix_instructions": instructions,
            "fix_requested_at": _now_iso(),
            "approved_at": None,
        },
    )


@router.patch("/engagement-graphics/{graphic_id}/reset")
async def reset_graphic(
    graphic_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Reset a graphic back to pending — used after a fix has been applied."""
    sb = get_supabase()
    _fetch_graphic_or_404(sb, graphic_id)
    return _update_and_return(
        sb,
        graphic_id,
        {
            "approval_status": "pending",
            "fix_instructions": None,
            "fix_requested_at": None,
            "approved_at": None,
        },
    )


@router.post("/engagements/{engagement_id}/graphics/approve-all")
async def approve_all_pending(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Batch approve every pending graphic for this engagement."""
    sb = get_supabase()
    update_result = (
        sb.table("engagement_graphics")
        .update({"approval_status": "approved", "approved_at": _now_iso()})
        .eq("engagement_id", engagement_id)
        .eq("approval_status", "pending")
        .execute()
    )
    updated_count = len(update_result.data or [])

    all_rows = (
        sb.table("engagement_graphics")
        .select("approval_status")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    return {
        "updated_count": updated_count,
        "summary": _summary_for_rows(all_rows.data or []),
    }
