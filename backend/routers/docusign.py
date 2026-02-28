from __future__ import annotations

import asyncio
import logging
from fastapi import APIRouter, Request, HTTPException, Response, BackgroundTasks
from models.schemas import DocuSignSendRequest, DocuSignResponse
from services.docusign_service import get_docusign_service
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    update_engagement_status,
    log_activity,
)
from services.email_service import get_email_service
from services.firecrawl_service import research_company

logger = logging.getLogger("baxterlabs.docusign.router")

router = APIRouter(prefix="/api/docusign", tags=["docusign"])


def _run_async_in_background(coro):
    """Helper to run an async coroutine from a sync BackgroundTask."""
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


@router.post("/send-nda", response_model=DocuSignResponse)
async def send_nda(body: DocuSignSendRequest):
    """Send NDA to client via DocuSign."""
    logger.info(f"send-nda endpoint called for engagement {body.engagement_id}")
    engagement = get_engagement_by_id(body.engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    client = engagement.get("clients", {})
    contact_email = client.get("primary_contact_email")
    contact_name = client.get("primary_contact_name")
    company_name = client.get("company_name")

    logger.info(f"send-nda — to={contact_email} name={contact_name} company={company_name}")

    if not contact_email or not contact_name:
        raise HTTPException(status_code=400, detail="Client contact info incomplete")

    ds = get_docusign_service()

    try:
        result = ds.send_nda(
            engagement_id=body.engagement_id,
            contact_email=contact_email,
            contact_name=contact_name,
            company_name=company_name,
        )
    except RuntimeError as e:
        logger.error(f"DocuSign send_nda error: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=str(e))

    logger.info(f"send-nda result: {result}")

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "DocuSign send failed"))

    sb = get_supabase()
    sb.table("legal_documents").insert({
        "engagement_id": body.engagement_id,
        "type": "nda",
        "docusign_envelope_id": result["envelope_id"],
        "status": "sent",
        "sent_at": "now()",
    }).execute()

    log_activity(body.engagement_id, "system", "nda_sent", {
        "envelope_id": result["envelope_id"],
        "to": contact_email,
    })

    return DocuSignResponse(
        success=True,
        envelope_id=result["envelope_id"],
        message="NDA sent successfully via DocuSign.",
    )


@router.post("/send-agreement", response_model=DocuSignResponse)
async def send_agreement(body: DocuSignSendRequest):
    """Send Engagement Agreement via DocuSign."""
    engagement = get_engagement_by_id(body.engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    client = engagement.get("clients", {})
    contact_email = client.get("primary_contact_email")
    contact_name = client.get("primary_contact_name")
    company_name = client.get("company_name")

    if not contact_email or not contact_name:
        raise HTTPException(status_code=400, detail="Client contact info incomplete")

    ds = get_docusign_service()

    try:
        result = ds.send_agreement(
            engagement_id=body.engagement_id,
            contact_email=contact_email,
            contact_name=contact_name,
            company_name=company_name,
            fee=engagement.get("fee", 12500),
            start_date=engagement.get("start_date", "TBD"),
            end_date=engagement.get("target_end_date", "TBD"),
        )
    except RuntimeError as e:
        logger.error(f"DocuSign send_agreement error: {e}")
        raise HTTPException(status_code=503, detail=str(e))

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "DocuSign send failed"))

    sb = get_supabase()
    sb.table("legal_documents").insert({
        "engagement_id": body.engagement_id,
        "type": "agreement",
        "docusign_envelope_id": result["envelope_id"],
        "status": "sent",
        "sent_at": "now()",
    }).execute()

    log_activity(body.engagement_id, "system", "agreement_sent", {
        "envelope_id": result["envelope_id"],
        "to": contact_email,
    })

    return DocuSignResponse(
        success=True,
        envelope_id=result["envelope_id"],
        message="Engagement Agreement sent successfully via DocuSign.",
    )


@router.post("/webhook")
async def docusign_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive DocuSign Connect webhook callbacks."""
    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=400)

    ds = get_docusign_service()
    result = ds.handle_webhook(payload)
    action = result.get("action", "unknown")
    envelope_id = result.get("envelope_id", "")

    if not envelope_id:
        return Response(status_code=200)

    sb = get_supabase()

    if action == "nda_signed":
        legal_result = (
            sb.table("legal_documents")
            .select("engagement_id")
            .eq("docusign_envelope_id", envelope_id)
            .eq("type", "nda")
            .execute()
        )

        if legal_result.data:
            engagement_id = legal_result.data[0]["engagement_id"]

            sb.table("legal_documents").update({
                "status": "signed",
                "signed_at": "now()",
            }).eq("docusign_envelope_id", envelope_id).execute()

            update_engagement_status(engagement_id, "nda_signed")

            log_activity(engagement_id, "system", "nda_signed", {
                "envelope_id": envelope_id,
            })

            engagement = get_engagement_by_id(engagement_id)
            if engagement:
                email_svc = get_email_service()
                nda_email_result = email_svc.send_nda_signed_notification(engagement)
                log_activity(engagement_id, "system", "email_sent", {
                    "type": "nda_signed_notification",
                    "to": "partner",
                    "result": nda_email_result,
                })

            # Trigger company research in background
            background_tasks.add_task(
                _run_async_in_background, research_company(engagement_id)
            )

            logger.info(f"NDA signed — envelope={envelope_id} engagement={engagement_id} — research triggered")

    elif action == "nda_declined":
        legal_result = (
            sb.table("legal_documents")
            .select("engagement_id")
            .eq("docusign_envelope_id", envelope_id)
            .eq("type", "nda")
            .execute()
        )
        if legal_result.data:
            engagement_id = legal_result.data[0]["engagement_id"]
            sb.table("legal_documents").update({
                "status": "declined",
            }).eq("docusign_envelope_id", envelope_id).execute()
            log_activity(engagement_id, "system", "nda_declined", {
                "envelope_id": envelope_id,
            })
            logger.info(f"NDA declined — envelope={envelope_id} engagement={engagement_id}")

    elif action == "agreement_signed":
        legal_result = (
            sb.table("legal_documents")
            .select("engagement_id")
            .eq("docusign_envelope_id", envelope_id)
            .eq("type", "agreement")
            .execute()
        )
        if legal_result.data:
            engagement_id = legal_result.data[0]["engagement_id"]

            sb.table("legal_documents").update({
                "status": "signed",
                "signed_at": "now()",
            }).eq("docusign_envelope_id", envelope_id).execute()

            update_engagement_status(engagement_id, "agreement_signed")

            log_activity(engagement_id, "system", "agreement_signed", {
                "envelope_id": envelope_id,
            })

            engagement = get_engagement_by_id(engagement_id)
            if engagement:
                email_svc = get_email_service()
                agreement_email_result = email_svc.send_agreement_signed_notification(engagement)
                log_activity(engagement_id, "system", "email_sent", {
                    "type": "agreement_signed_notification",
                    "to": "partner",
                    "result": agreement_email_result,
                })
                # Generate upload_token on the fly if missing (legacy engagements)
                if not engagement.get("upload_token"):
                    import uuid as _uuid
                    new_token = str(_uuid.uuid4())
                    sb.table("engagements").update({"upload_token": new_token}).eq("id", engagement_id).execute()
                    engagement["upload_token"] = new_token
                    logger.info(f"Generated upload_token for engagement {engagement_id}: {new_token}")
                # Send onboarding confirmation email (if no onboarding token yet)
                if not engagement.get("onboarding_token"):
                    import secrets as _secrets
                    ob_token = _secrets.token_urlsafe(32)
                    sb.table("engagements").update({"onboarding_token": ob_token}).eq("id", engagement_id).execute()
                    engagement["onboarding_token"] = ob_token
                    logger.info(f"Generated onboarding_token for engagement {engagement_id}")
                ob_token = engagement.get("onboarding_token")
                ob_email_result = email_svc.send_engagement_confirmation_email(
                    engagement=engagement,
                    client=engagement.get("clients", {}),
                    onboarding_token=ob_token,
                )
                log_activity(engagement_id, "system", "onboarding_email_sent", {
                    "trigger": "agreement_signed",
                    "to": engagement.get("clients", {}).get("primary_contact_email"),
                    "result": ob_email_result,
                })
                # Upload portal email deferred — sent when onboarding is completed
                # (document contact identified via onboarding form)

            # Trigger deposit invoice generation
            try:
                from routers.invoices import create_and_send_invoice
                create_and_send_invoice(
                    engagement_id=engagement_id,
                    invoice_type="deposit",
                    send_email=True,
                )
                logger.info(f"Deposit invoice triggered for engagement {engagement_id}")
            except Exception as inv_err:
                logger.error(f"Deposit invoice generation failed (non-blocking): {inv_err}")

            logger.info(f"Agreement signed — envelope={envelope_id} engagement={engagement_id}")

    # --- Pipeline NDA signed (no engagement yet) ---
    elif action == "pipeline_nda_signed":
        pipeline_result = (
            sb.table("pipeline_opportunities")
            .select("id, primary_contact_id, company_id, assigned_to")
            .eq("nda_envelope_id", envelope_id)
            .eq("is_deleted", False)
            .execute()
        )
        if pipeline_result.data:
            opp = pipeline_result.data[0]
            sb.table("pipeline_opportunities").update({
                "stage": "nda_signed",
            }).eq("id", opp["id"]).execute()

            # Send confirmation to prospect
            if opp.get("primary_contact_id"):
                contact = sb.table("pipeline_contacts").select("name, email").eq("id", opp["primary_contact_id"]).execute()
                company = sb.table("pipeline_companies").select("name").eq("id", opp["company_id"]).execute()
                if contact.data and contact.data[0].get("email"):
                    email_svc = get_email_service()
                    email_svc.send_pipeline_nda_signed_notification(
                        to_email=contact.data[0]["email"],
                        contact_name=contact.data[0]["name"],
                        company_name=company.data[0]["name"] if company.data else "Unknown",
                    )

            logger.info(f"Pipeline NDA signed — envelope={envelope_id} opp={opp['id']}")

    # --- Pipeline Agreement signed → auto-conversion ---
    elif action == "pipeline_agreement_signed":
        pipeline_result = (
            sb.table("pipeline_opportunities")
            .select("id")
            .eq("agreement_envelope_id", envelope_id)
            .eq("is_deleted", False)
            .execute()
        )
        if pipeline_result.data:
            opp_id = pipeline_result.data[0]["id"]
            background_tasks.add_task(
                _run_async_in_background,
                _auto_convert_pipeline_opportunity(opp_id),
            )
            logger.info(f"Pipeline agreement signed — envelope={envelope_id} opp={opp_id} — auto-conversion triggered")

    return Response(status_code=200)


async def _auto_convert_pipeline_opportunity(opp_id: str) -> None:
    """Auto-convert a pipeline opportunity after agreement is signed.

    Creates client, engagement, storage folders, sends deposit invoice + upload link.
    """
    import uuid as _uuid

    sb = get_supabase()

    # 1. Fetch opportunity, company, contact
    opp = sb.table("pipeline_opportunities").select("*").eq("id", opp_id).execute()
    if not opp.data:
        logger.error(f"Auto-convert: opportunity {opp_id} not found")
        return
    opp = opp.data[0]

    company = sb.table("pipeline_companies").select("*").eq("id", opp["company_id"]).execute()
    if not company.data:
        logger.error(f"Auto-convert: company {opp['company_id']} not found")
        return
    company = company.data[0]

    contact = None
    if opp.get("primary_contact_id"):
        contact_result = sb.table("pipeline_contacts").select("*").eq("id", opp["primary_contact_id"]).execute()
        if contact_result.data:
            contact = contact_result.data[0]

    # 2. Create client record
    client_row = {
        "company_name": company["name"],
        "primary_contact_name": contact["name"] if contact else company["name"],
        "primary_contact_email": (contact or {}).get("email", ""),
        "primary_contact_phone": (contact or {}).get("phone"),
        "industry": company.get("industry"),
        "revenue_range": company.get("revenue_range"),
        "employee_count": company.get("employee_count"),
        "website_url": company.get("website"),
        "referral_source": company.get("source"),
    }
    client_result = sb.table("clients").insert(client_row).execute()
    new_client_id = client_result.data[0]["id"]

    # 3. Create engagement (status = agreement_signed, NOT nda_pending)
    import secrets as _secrets
    upload_token = str(_uuid.uuid4())
    onboarding_token = _secrets.token_urlsafe(32)
    engagement_row = {
        "client_id": new_client_id,
        "status": "agreement_signed",
        "phase": 0,
        "fee": opp.get("estimated_value") or 12500,
        "partner_lead": opp.get("assigned_to") or "George DeVries",
        "upload_token": upload_token,
        "onboarding_token": onboarding_token,
    }
    engagement_result = sb.table("engagements").insert(engagement_row).execute()
    new_engagement = engagement_result.data[0]
    new_engagement_id = new_engagement["id"]

    # 4. Create interview_contacts from interview_contacts_json (website intake)
    icj = opp.get("interview_contacts_json")
    if icj:
        import json
        parsed = json.loads(icj) if isinstance(icj, str) else icj
        for i, raw_c in enumerate(parsed[:3], start=1):
            sb.table("interview_contacts").insert({
                "engagement_id": new_engagement_id,
                "contact_number": i,
                "name": raw_c["name"],
                "title": raw_c.get("title"),
                "email": raw_c.get("email"),
                "phone": raw_c.get("phone"),
                "linkedin_url": raw_c.get("linkedin_url"),
            }).execute()
        logger.info(f"Auto-convert: created {min(len(parsed), 3)} interview contacts from JSON")

    # 5. Link opportunity → won
    sb.table("pipeline_opportunities").update({
        "converted_client_id": new_client_id,
        "converted_engagement_id": new_engagement_id,
        "stage": "won",
    }).eq("id", opp_id).execute()

    # 6. Create storage folders
    try:
        from services.supabase_client import create_engagement_folders
        create_engagement_folders(new_engagement_id)
    except Exception as e:
        logger.warning(f"Auto-convert: failed to create folders: {e}")

    # 7. Send deposit invoice
    try:
        from routers.invoices import create_and_send_invoice
        create_and_send_invoice(
            engagement_id=new_engagement_id,
            invoice_type="deposit",
            send_email=True,
        )
        logger.info(f"Auto-convert: deposit invoice sent for engagement {new_engagement_id}")
    except Exception as e:
        logger.error(f"Auto-convert: invoice failed: {e}")

    # 8. Send onboarding confirmation email (BEFORE upload link)
    try:
        full_engagement = get_engagement_by_id(new_engagement_id)
        if full_engagement:
            email_svc = get_email_service()
            email_svc.send_engagement_confirmation_email(
                engagement=full_engagement,
                client=full_engagement.get("clients", {}),
                onboarding_token=onboarding_token,
            )
            log_activity(new_engagement_id, "system", "onboarding_email_sent", {
                "trigger": "auto_conversion",
                "to": (contact or {}).get("email"),
            })
            logger.info(f"Auto-convert: onboarding email sent for engagement {new_engagement_id}")
    except Exception as e:
        logger.error(f"Auto-convert: onboarding email failed: {e}")

    # 9. Upload portal email deferred — sent when onboarding is completed
    #    (document contact identified via onboarding form)

    # 10. Log activities
    log_activity(new_engagement_id, "system", "engagement_created_from_pipeline", {
        "opportunity_id": opp_id,
        "company_name": company["name"],
        "trigger": "agreement_signed_webhook",
        "auto_conversion": True,
    })

    logger.info(
        f"Auto-convert complete: opp {opp_id} → client {new_client_id}, "
        f"engagement {new_engagement_id}"
    )


@router.get("/consent-url")
async def get_consent_url():
    """Return the DocuSign consent URL (needed for first-time setup)."""
    ds = get_docusign_service()
    return {"consent_url": ds.get_consent_url()}
