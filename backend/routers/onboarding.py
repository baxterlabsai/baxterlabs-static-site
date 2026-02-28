from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from middleware.auth import verify_onboarding_token
from services.supabase_client import get_supabase, log_activity
from services.email_service import get_email_service, DEFAULT_PARTNER_EMAIL

logger = logging.getLogger("baxterlabs.onboarding")

router = APIRouter(prefix="/api", tags=["onboarding"])


class InterviewContactInput(BaseModel):
    name: str
    title: str
    email: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    context_notes: Optional[str] = None


class OnboardSubmission(BaseModel):
    contacts: List[InterviewContactInput]


@router.get("/onboard/{token}")
async def get_onboarding(token: str):
    """Validate onboarding token and return engagement context + existing contacts."""
    engagement = await verify_onboarding_token(token)
    engagement_id = engagement["id"]
    client = engagement.get("clients", {})

    sb = get_supabase()
    contacts_result = (
        sb.table("interview_contacts")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("contact_number")
        .execute()
    )

    completed_at = engagement.get("onboarding_completed_at")

    return {
        "engagement_id": engagement_id,
        "company_name": client.get("company_name", ""),
        "primary_contact_name": client.get("primary_contact_name", ""),
        "completed": completed_at is not None,
        "completed_at": completed_at,
        "contacts": [
            {
                "name": c["name"],
                "title": c.get("title"),
                "email": c.get("email"),
                "phone": c.get("phone"),
                "linkedin_url": c.get("linkedin_url"),
                "context_notes": c.get("context_notes"),
            }
            for c in contacts_result.data
        ],
    }


@router.post("/onboard/{token}")
async def submit_onboarding(token: str, body: OnboardSubmission):
    """Submit interview contacts for an engagement."""
    engagement = await verify_onboarding_token(token)
    engagement_id = engagement["id"]
    client = engagement.get("clients", {})

    # Block re-submission
    if engagement.get("onboarding_completed_at"):
        raise HTTPException(
            status_code=400,
            detail="Onboarding has already been completed. Contact george@baxterlabs.ai to make changes.",
        )

    if not body.contacts or len(body.contacts) < 1:
        raise HTTPException(status_code=400, detail="At least 1 interview contact is required.")
    if len(body.contacts) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 interview contacts allowed.")

    sb = get_supabase()

    # Delete existing contacts for this engagement (in case of partial prior state)
    sb.table("interview_contacts").delete().eq("engagement_id", engagement_id).execute()

    # Insert new contacts
    for i, contact in enumerate(body.contacts, start=1):
        sb.table("interview_contacts").insert({
            "engagement_id": engagement_id,
            "contact_number": i,
            "name": contact.name,
            "title": contact.title,
            "email": contact.email,
            "phone": contact.phone,
            "linkedin_url": contact.linkedin_url,
            "context_notes": contact.context_notes,
        }).execute()

    # Mark onboarding completed
    sb.table("engagements").update({
        "onboarding_completed_at": "now()",
    }).eq("id", engagement_id).execute()

    # Log activity
    contact_name = client.get("primary_contact_name", "Client")
    company_name = client.get("company_name", "Unknown")
    log_activity(engagement_id, "client", "onboarding_completed", {
        "contact_count": len(body.contacts),
        "submitted_by": contact_name,
    })

    # Notify partner
    try:
        email_svc = get_email_service()
        email_svc.send_onboarding_completed_notification(
            contact_name=contact_name,
            company_name=company_name,
            contact_count=len(body.contacts),
            engagement_id=engagement_id,
        )
    except Exception as e:
        logger.error(f"Onboarding notification email failed: {e}")

    return {
        "success": True,
        "contact_count": len(body.contacts),
        "contacts": [
            {
                "name": c.name,
                "title": c.title,
                "email": c.email,
                "phone": c.phone,
                "linkedin_url": c.linkedin_url,
                "context_notes": c.context_notes,
            }
            for c in body.contacts
        ],
    }


@router.post("/onboard/{token}/resend")
async def resend_onboarding_email(token: str):
    """Resend the onboarding confirmation email (for dashboard use)."""
    engagement = await verify_onboarding_token(token)
    engagement_id = engagement["id"]
    client = engagement.get("clients", {})

    email_svc = get_email_service()
    result = email_svc.send_engagement_confirmation_email(
        engagement=engagement,
        client=client,
        onboarding_token=token,
    )

    log_activity(engagement_id, "system", "onboarding_email_resent", {
        "to": client.get("primary_contact_email"),
        "result": result,
    })

    return {"success": result.get("success", False)}
