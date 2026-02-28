from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from middleware.auth import verify_onboarding_token
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
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


class DocumentContactInput(BaseModel):
    name: str
    title: str
    email: str
    phone: Optional[str] = None


class OnboardSubmission(BaseModel):
    contacts: List[InterviewContactInput]
    document_contact: DocumentContactInput


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
        "document_contact": {
            "name": engagement.get("document_contact_name") or "",
            "title": engagement.get("document_contact_title") or "",
            "email": engagement.get("document_contact_email") or "",
            "phone": engagement.get("document_contact_phone") or "",
        },
    }


@router.post("/onboard/{token}")
async def submit_onboarding(token: str, body: OnboardSubmission):
    """Submit interview contacts and document contact for an engagement."""
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

    # Insert new interview contacts
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

    # Save document contact + mark onboarding completed
    dc = body.document_contact
    sb.table("engagements").update({
        "document_contact_name": dc.name,
        "document_contact_title": dc.title,
        "document_contact_email": dc.email,
        "document_contact_phone": dc.phone,
        "onboarding_completed_at": "now()",
    }).eq("id", engagement_id).execute()

    # Log activity
    primary_name = client.get("primary_contact_name", "Client")
    company_name = client.get("company_name", "Unknown")
    log_activity(engagement_id, "client", "onboarding_completed", {
        "interview_contact_count": len(body.contacts),
        "document_contact_name": dc.name,
        "document_contact_email": dc.email,
        "submitted_by": primary_name,
    })

    # Send upload portal email to document contact (cc the decision maker)
    try:
        full_engagement = get_engagement_by_id(engagement_id)
        if full_engagement:
            email_svc = get_email_service()
            upload_result = email_svc.send_upload_link(
                engagement=full_engagement,
                document_contact_name=dc.name,
                document_contact_email=dc.email,
            )
            log_activity(engagement_id, "system", "upload_link_sent", {
                "trigger": "onboarding_completed",
                "to": dc.email,
                "cc": client.get("primary_contact_email"),
                "result": upload_result,
            })
            logger.info(f"Upload portal email sent to {dc.email} for engagement {engagement_id}")
    except Exception as e:
        logger.error(f"Upload portal email failed: {e}")

    # Notify partner
    try:
        email_svc = get_email_service()
        email_svc.send_onboarding_completed_notification(
            contact_name=primary_name,
            company_name=company_name,
            contact_count=len(body.contacts),
            engagement_id=engagement_id,
            document_contact_name=dc.name,
        )
    except Exception as e:
        logger.error(f"Onboarding notification email failed: {e}")

    return {
        "success": True,
        "contact_count": len(body.contacts),
        "document_contact_name": dc.name,
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
