from __future__ import annotations

import logging
import uuid
from fastapi import APIRouter
from models.schemas import IntakeFormInput, IntakeResponse
from services.supabase_client import get_supabase, log_activity, create_engagement_folders
from services.email_service import get_email_service
from services.docusign_service import get_docusign_service

logger = logging.getLogger("baxterlabs.intake")

router = APIRouter(prefix="/api", tags=["intake"])


@router.post("/intake", response_model=IntakeResponse)
async def submit_intake(form: IntakeFormInput):
    """Submit the Get Started intake form. Creates client, engagement, interview contacts,
    storage folders, sends partner notification, and triggers DocuSign NDA."""
    sb = get_supabase()
    email_svc = get_email_service()

    # 1. Create client
    client_data = {
        "company_name": form.company_name,
        "primary_contact_name": form.primary_contact_name,
        "primary_contact_email": form.primary_contact_email,
        "primary_contact_phone": form.primary_contact_phone,
        "industry": form.industry,
        "revenue_range": form.revenue_range,
        "employee_count": form.employee_count,
        "website_url": form.website_url,
        "referral_source": form.referral_source,
    }
    client_result = sb.table("clients").insert(client_data).execute()
    client = client_result.data[0]

    # 2. Create engagement (generate upload_token upfront so it's ready when needed)
    engagement_data = {
        "client_id": client["id"],
        "status": "nda_pending",
        "pain_points": form.pain_points,
        "preferred_start_date": form.preferred_start_date.isoformat() if form.preferred_start_date else None,
        "upload_token": str(uuid.uuid4()),
    }
    engagement_result = sb.table("engagements").insert(engagement_data).execute()
    engagement = engagement_result.data[0]

    # 3. Create interview contacts
    for i, contact in enumerate(form.interview_contacts[:3], start=1):
        contact_data = {
            "engagement_id": engagement["id"],
            "contact_number": i,
            "name": contact.name,
            "title": contact.title,
            "email": contact.email,
            "phone": contact.phone,
            "linkedin_url": contact.linkedin_url,
        }
        sb.table("interview_contacts").insert(contact_data).execute()

    # 4. Create storage folders
    try:
        create_engagement_folders(engagement["id"])
        logger.info(f"Storage folders created for engagement {engagement['id']}")
    except Exception as e:
        logger.warning(f"Failed to create storage folders: {e}")

    # 5. Log activity
    log_activity(engagement["id"], "system", "intake_submitted", {
        "company_name": form.company_name,
        "contact_email": form.primary_contact_email,
    })

    # 6. Send partner notification email
    engagement["clients"] = client
    email_svc.send_intake_notification(engagement)

    # 7. Trigger DocuSign NDA (non-blocking — don't fail intake if DocuSign errors)
    try:
        ds = get_docusign_service()
        if ds._is_configured():
            nda_result = ds.send_nda(
                engagement_id=engagement["id"],
                contact_email=form.primary_contact_email,
                contact_name=form.primary_contact_name,
                company_name=form.company_name,
            )
            if nda_result.get("success"):
                # Record in legal_documents
                sb.table("legal_documents").insert({
                    "engagement_id": engagement["id"],
                    "type": "nda",
                    "docusign_envelope_id": nda_result["envelope_id"],
                    "status": "sent",
                    "sent_at": "now()",
                }).execute()
                log_activity(engagement["id"], "system", "nda_sent", {
                    "envelope_id": nda_result["envelope_id"],
                })
                logger.info(f"NDA sent for engagement {engagement['id']}")
            else:
                logger.warning(f"DocuSign NDA send failed: {nda_result.get('error')}")
        else:
            logger.info("DocuSign not configured — skipping NDA send")
    except Exception as e:
        logger.warning(f"DocuSign NDA trigger failed (non-blocking): {e}")

    return IntakeResponse(
        success=True,
        engagement_id=engagement["id"],
        client_id=client["id"],
        message="Intake submitted successfully. NDA will be sent shortly.",
    )
