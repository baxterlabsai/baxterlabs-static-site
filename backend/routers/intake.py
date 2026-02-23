from fastapi import APIRouter
from models.schemas import IntakeFormInput, IntakeResponse
from services.supabase_client import get_supabase, log_activity
from services.email_service import get_email_service

router = APIRouter(prefix="/api", tags=["intake"])


@router.post("/intake", response_model=IntakeResponse)
async def submit_intake(form: IntakeFormInput):
    """Submit the Get Started intake form. Creates client, engagement, and interview contacts."""
    sb = get_supabase()
    email_svc = get_email_service()

    # Create client
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

    # Create engagement
    engagement_data = {
        "client_id": client["id"],
        "status": "nda_pending",
        "pain_points": form.pain_points,
        "preferred_start_date": form.preferred_start_date.isoformat() if form.preferred_start_date else None,
    }
    engagement_result = sb.table("engagements").insert(engagement_data).execute()
    engagement = engagement_result.data[0]

    # Create interview contacts
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

    # Log activity
    log_activity(engagement["id"], "system", "intake_submitted", {
        "company_name": form.company_name,
        "contact_email": form.primary_contact_email,
    })

    # Notify partner
    engagement["clients"] = client
    email_svc.send_intake_notification(engagement)

    return IntakeResponse(
        success=True,
        engagement_id=engagement["id"],
        client_id=client["id"],
        message="Intake submitted successfully. NDA will be sent shortly.",
    )
