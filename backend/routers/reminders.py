from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    log_activity,
)
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.reminders")

router = APIRouter(prefix="/api", tags=["reminders"])


def _check_rate_limit(engagement_id: str, reminder_type: str) -> None:
    """Raise 429 if a reminder of this type was sent within the last 24 hours."""
    sb = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    result = (
        sb.table("activity_log")
        .select("created_at")
        .eq("engagement_id", engagement_id)
        .eq("action", "reminder_sent")
        .gte("created_at", cutoff)
        .execute()
    )

    # Filter by reminder_type in details — Supabase doesn't support JSONB filtering
    # easily via the client, so we filter in code
    for entry in result.data:
        # All recent reminders of this type — but we stored type in details
        pass

    # Re-query with a more precise check using the details column
    all_reminders = (
        sb.table("activity_log")
        .select("details, created_at")
        .eq("engagement_id", engagement_id)
        .eq("action", "reminder_sent")
        .gte("created_at", cutoff)
        .execute()
    )

    for entry in all_reminders.data:
        details = entry.get("details", {})
        if isinstance(details, dict) and details.get("reminder_type") == reminder_type:
            raise HTTPException(
                status_code=429,
                detail="Reminder already sent within the last 24 hours",
            )


def _get_last_reminder(engagement_id: str, reminder_type: str) -> str:
    """Return ISO timestamp of last reminder of this type, or empty string."""
    sb = get_supabase()
    result = (
        sb.table("activity_log")
        .select("created_at, details")
        .eq("engagement_id", engagement_id)
        .eq("action", "reminder_sent")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    for entry in result.data:
        details = entry.get("details", {})
        if isinstance(details, dict) and details.get("reminder_type") == reminder_type:
            return entry.get("created_at", "")
    return ""


@router.post("/engagements/{engagement_id}/remind/nda")
async def remind_nda(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Send a reminder to the client that their NDA is pending signature."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("nda_pending",):
        raise HTTPException(status_code=400, detail="NDA is not pending for this engagement")

    _check_rate_limit(engagement_id, "nda")

    email_svc = get_email_service()
    result = email_svc.send_reminder_nda(engagement)

    log_activity(engagement_id, "partner", "reminder_sent", {
        "reminder_type": "nda",
        "to": engagement.get("clients", {}).get("primary_contact_email"),
        "result": result,
    })

    return {
        "success": True,
        "message": f"NDA reminder sent to {engagement.get('clients', {}).get('primary_contact_email')}",
    }


@router.post("/engagements/{engagement_id}/remind/agreement")
async def remind_agreement(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Send a reminder to the client that their Engagement Agreement is pending signature."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("agreement_pending",):
        raise HTTPException(status_code=400, detail="Agreement is not pending for this engagement")

    _check_rate_limit(engagement_id, "agreement")

    email_svc = get_email_service()
    result = email_svc.send_reminder_agreement(engagement)

    log_activity(engagement_id, "partner", "reminder_sent", {
        "reminder_type": "agreement",
        "to": engagement.get("clients", {}).get("primary_contact_email"),
        "result": result,
    })

    return {
        "success": True,
        "message": f"Agreement reminder sent to {engagement.get('clients', {}).get('primary_contact_email')}",
    }


@router.post("/engagements/{engagement_id}/remind/documents")
async def remind_documents(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Send a reminder to the client that documents are still outstanding."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement["status"] not in ("agreement_signed", "documents_pending"):
        raise HTTPException(status_code=400, detail="Documents are not pending for this engagement")

    _check_rate_limit(engagement_id, "documents")

    # Count uploaded vs required documents
    from config.upload_checklist import REQUIRED_ITEMS

    sb = get_supabase()
    docs_result = (
        sb.table("documents")
        .select("item_name")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    uploaded_items = {d.get("item_name") for d in docs_result.data if d.get("item_name")}
    required_keys = {item["key"] for item in REQUIRED_ITEMS}
    uploaded_required = len(uploaded_items & required_keys)
    total_required = len(required_keys)

    email_svc = get_email_service()
    result = email_svc.send_reminder_documents(engagement, uploaded_required, total_required)

    log_activity(engagement_id, "partner", "reminder_sent", {
        "reminder_type": "documents",
        "to": engagement.get("clients", {}).get("primary_contact_email"),
        "uploaded": uploaded_required,
        "total_required": total_required,
        "result": result,
    })

    return {
        "success": True,
        "message": f"Document reminder sent to {engagement.get('clients', {}).get('primary_contact_email')}",
        "uploaded": uploaded_required,
        "total_required": total_required,
    }


@router.get("/engagements/{engagement_id}/reminders/last")
async def get_last_reminders(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Get the last reminder timestamps for each type."""
    return {
        "nda": _get_last_reminder(engagement_id, "nda"),
        "agreement": _get_last_reminder(engagement_id, "agreement"),
        "documents": _get_last_reminder(engagement_id, "documents"),
    }
