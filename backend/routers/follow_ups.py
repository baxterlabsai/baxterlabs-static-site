"""Follow-up sequence CRUD and action endpoints."""

from __future__ import annotations

import logging
from datetime import date, timedelta, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.follow_up_service import render_template, build_template_variables

logger = logging.getLogger("baxterlabs.follow_ups")

router = APIRouter(prefix="/api", tags=["follow-ups"])

TOUCHPOINT_LABELS = {
    "30_day": "30-Day Check-In",
    "60_day": "60-Day Pulse Check",
    "90_day": "90-Day Review Offer",
}

TOUCHPOINT_ORDER = {"30_day": 1, "60_day": 2, "90_day": 3}


# ── List Endpoints ───────────────────────────────────────────────────────

@router.get("/follow-ups")
async def list_follow_ups(
    status: Optional[str] = Query(None),
    upcoming_only: bool = Query(False),
    user: dict = Depends(verify_partner_auth),
):
    """List all follow-ups. Default: actionable items (scheduled + snoozed-and-due)."""
    sb = get_supabase()
    today_str = date.today().isoformat()

    if upcoming_only:
        # Scheduled items + snoozed items where snoozed_until <= today
        scheduled = (
            sb.table("follow_up_sequences")
            .select("*, engagements(id, partner_lead, fee, status), clients(id, company_name, primary_contact_name, primary_contact_email)")
            .eq("status", "scheduled")
            .order("scheduled_date")
            .execute()
        )
        snoozed = (
            sb.table("follow_up_sequences")
            .select("*, engagements(id, partner_lead, fee, status), clients(id, company_name, primary_contact_name, primary_contact_email)")
            .eq("status", "snoozed")
            .lte("snoozed_until", today_str)
            .order("scheduled_date")
            .execute()
        )
        items = (scheduled.data or []) + (snoozed.data or [])
        # Sort by scheduled_date
        items.sort(key=lambda x: x.get("scheduled_date", ""))
    elif status:
        result = (
            sb.table("follow_up_sequences")
            .select("*, engagements(id, partner_lead, fee, status), clients(id, company_name, primary_contact_name, primary_contact_email)")
            .eq("status", status)
            .order("scheduled_date")
            .execute()
        )
        items = result.data or []
    else:
        result = (
            sb.table("follow_up_sequences")
            .select("*, engagements(id, partner_lead, fee, status), clients(id, company_name, primary_contact_name, primary_contact_email)")
            .order("scheduled_date")
            .execute()
        )
        items = result.data or []

    return {"follow_ups": items, "count": len(items)}


@router.get("/engagements/{engagement_id}/follow-ups")
async def get_engagement_follow_ups(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """List follow-ups for a specific engagement, ordered by touchpoint."""
    sb = get_supabase()
    result = (
        sb.table("follow_up_sequences")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("scheduled_date")
        .execute()
    )
    # Sort by touchpoint order (30, 60, 90)
    items = sorted(result.data or [], key=lambda x: TOUCHPOINT_ORDER.get(x.get("touchpoint", ""), 99))
    return {"follow_ups": items, "count": len(items)}


@router.get("/follow-ups/{follow_up_id}")
async def get_follow_up(
    follow_up_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Get a single follow-up with rendered template."""
    sb = get_supabase()
    result = (
        sb.table("follow_up_sequences")
        .select("*, engagements(id, partner_lead, fee, status, start_date), clients(id, company_name, primary_contact_name, primary_contact_email)")
        .eq("id", follow_up_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    item = result.data[0]
    engagement = item.get("engagements") or {}
    client = item.get("clients") or {}

    # Render templates with actual values
    variables = build_template_variables(engagement, client)
    rendered_subject = render_template(item["subject_template"], variables)
    rendered_body = render_template(item["body_template"], variables)

    item["rendered_subject"] = rendered_subject
    item["rendered_body"] = rendered_body

    return item


# ── Action Endpoint ──────────────────────────────────────────────────────

class FollowUpAction(BaseModel):
    action: str  # 'send', 'snooze', 'skip', 'edit'
    actual_subject: Optional[str] = None
    actual_body: Optional[str] = None
    snooze_days: Optional[int] = 7
    notes: Optional[str] = None


@router.patch("/follow-ups/{follow_up_id}")
async def update_follow_up(
    follow_up_id: str,
    body: FollowUpAction,
    user: dict = Depends(verify_partner_auth),
):
    """Update a follow-up: send, snooze, skip, or edit."""
    sb = get_supabase()

    result = (
        sb.table("follow_up_sequences")
        .select("*, engagements(id, partner_lead, fee, status, start_date), clients(id, company_name, primary_contact_name, primary_contact_email)")
        .eq("id", follow_up_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    item = result.data[0]
    engagement_id = item["engagement_id"]
    touchpoint = item["touchpoint"]
    label = TOUCHPOINT_LABELS.get(touchpoint, touchpoint)
    client = item.get("clients") or {}
    contact_email = client.get("primary_contact_email", "")
    now = datetime.now(timezone.utc).isoformat()

    if body.action == "send":
        if item["status"] in ("sent", "skipped"):
            raise HTTPException(status_code=400, detail=f"Cannot send — follow-up is already {item['status']}")

        update_data = {
            "status": "sent",
            "sent_at": now,
            "updated_at": now,
        }
        if body.actual_subject:
            update_data["actual_subject"] = body.actual_subject
        if body.actual_body:
            update_data["actual_body"] = body.actual_body

        sb.table("follow_up_sequences").update(update_data).eq("id", follow_up_id).execute()

        log_activity(engagement_id, "partner", "follow_up_sent", {
            "touchpoint": touchpoint,
            "label": label,
            "to": contact_email,
        })

        return {"success": True, "message": f"{label} marked as sent"}

    elif body.action == "snooze":
        if item["status"] in ("sent", "skipped"):
            raise HTTPException(status_code=400, detail=f"Cannot snooze — follow-up is already {item['status']}")

        snooze_until = (date.today() + timedelta(days=body.snooze_days or 7)).isoformat()
        sb.table("follow_up_sequences").update({
            "status": "snoozed",
            "snoozed_until": snooze_until,
            "updated_at": now,
        }).eq("id", follow_up_id).execute()

        log_activity(engagement_id, "partner", "follow_up_snoozed", {
            "touchpoint": touchpoint,
            "label": label,
            "snoozed_until": snooze_until,
        })

        return {"success": True, "message": f"{label} snoozed until {snooze_until}"}

    elif body.action == "skip":
        if item["status"] in ("sent",):
            raise HTTPException(status_code=400, detail="Cannot skip — follow-up was already sent")

        update_data = {
            "status": "skipped",
            "skipped_at": now,
            "updated_at": now,
        }
        if body.notes:
            update_data["notes"] = body.notes

        sb.table("follow_up_sequences").update(update_data).eq("id", follow_up_id).execute()

        log_activity(engagement_id, "partner", "follow_up_skipped", {
            "touchpoint": touchpoint,
            "label": label,
            "notes": body.notes,
        })

        return {"success": True, "message": f"{label} skipped"}

    elif body.action == "edit":
        update_data = {"updated_at": now}
        if body.actual_subject is not None:
            update_data["actual_subject"] = body.actual_subject
        if body.actual_body is not None:
            update_data["actual_body"] = body.actual_body
        if body.notes is not None:
            update_data["notes"] = body.notes

        sb.table("follow_up_sequences").update(update_data).eq("id", follow_up_id).execute()

        return {"success": True, "message": f"{label} draft updated"}

    else:
        raise HTTPException(status_code=400, detail=f"Invalid action: {body.action}. Must be send, snooze, skip, or edit.")
