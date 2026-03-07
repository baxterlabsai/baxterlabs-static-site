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
    body = await request.body()
    if not body:
        return Response(status_code=400)

    payload = None
    # Try JSON first (Connect v2.0 / SIM format)
    try:
        import json
        payload = json.loads(body)
    except (json.JSONDecodeError, ValueError):
        pass

    # Fall back to XML (default Connect v1 / eventNotification format)
    if payload is None:
        try:
            import xml.etree.ElementTree as ET
            import re
            # Strip XML namespace declarations for reliable element lookup
            body_str = body.decode("utf-8") if isinstance(body, bytes) else body
            body_clean = re.sub(r'\sxmlns(?::\w+)?="[^"]*"', "", body_str)
            root = ET.fromstring(body_clean)
            env_status = root.find(".//EnvelopeStatus")
            if env_status is not None:
                status_el = env_status.find("Status")
                env_id_el = env_status.find("EnvelopeID")
                payload = {
                    "EnvelopeStatus": {
                        "Status": status_el.text if status_el is not None else "",
                        "EnvelopeID": env_id_el.text if env_id_el is not None else "",
                    }
                }
                logger.info(f"Parsed DocuSign XML webhook — Status={payload['EnvelopeStatus']['Status']} EnvelopeID={payload['EnvelopeStatus']['EnvelopeID']}")
            else:
                logger.warning(f"DocuSign XML webhook — could not find EnvelopeStatus element")
                payload = {}
        except Exception as xml_err:
            logger.error(f"DocuSign webhook — failed to parse body as JSON or XML: {xml_err}")
            return Response(status_code=400)

    ds = get_docusign_service()
    result = ds.handle_webhook(payload)
    action = result.get("action", "unknown")
    envelope_id = result.get("envelope_id", "")

    if not envelope_id:
        return Response(status_code=200)

    sb = get_supabase()

    if action == "agreement_signed":
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

            # Download and store signed PDF in background
            background_tasks.add_task(
                _download_and_store_signed_pdf, envelope_id, engagement_id,
            )

            logger.info(f"Agreement signed — envelope={envelope_id} engagement={engagement_id}")

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


def _download_and_store_signed_pdf(envelope_id: str, engagement_id: str) -> None:
    """Download the signed PDF from DocuSign and store it in Supabase storage."""
    try:
        ds = get_docusign_service()
        pdf_bytes = ds.get_signed_document(envelope_id)

        sb = get_supabase()
        storage_path = f"{engagement_id}/agreements/{envelope_id}_signed.pdf"

        sb.storage.from_("engagements").upload(
            storage_path, pdf_bytes, {"content-type": "application/pdf"},
        )

        sb.table("legal_documents").update({
            "signed_pdf_path": storage_path,
        }).eq("docusign_envelope_id", envelope_id).execute()

        logger.info(f"Signed PDF stored — envelope={envelope_id} path={storage_path}")
    except Exception as e:
        logger.error(f"Failed to download/store signed PDF for envelope {envelope_id}: {e}")


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

    # 3. Create engagement (status = agreement_signed)
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

    # 4b. Create legal_documents record for the signed agreement and store PDF
    envelope_id = opp.get("agreement_envelope_id")
    if envelope_id:
        legal_row = sb.table("legal_documents").insert({
            "engagement_id": new_engagement_id,
            "type": "agreement",
            "docusign_envelope_id": envelope_id,
            "status": "signed",
            "sent_at": "now()",
            "signed_at": "now()",
        }).execute()
        logger.info(f"Auto-convert: created legal_documents record for envelope {envelope_id}")
        _download_and_store_signed_pdf(envelope_id, new_engagement_id)

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

    # --- Google Drive archiving (non-blocking) ---
    try:
        from services.docusign_service import list_envelope_documents, fetch_envelope_document
        from services.google_drive_service import upload_signed_document

        _envelope_id = opp.get("agreement_envelope_id")
        _client_name = company["name"]

        if _envelope_id:
            doc_list = list_envelope_documents(_envelope_id)

            label_map = {}
            for doc in doc_list:
                name_lower = doc.get("name", "").lower()
                if "nda" in name_lower or "non-disclosure" in name_lower or "mutual" in name_lower:
                    label_map[doc["documentId"]] = "NDA"
                elif "engagement" in name_lower or "agreement" in name_lower:
                    label_map[doc["documentId"]] = "Engagement Agreement"

            if len(label_map) < 2 and len(doc_list) >= 2:
                label_map[doc_list[0]["documentId"]] = "NDA"
                label_map[doc_list[1]["documentId"]] = "Engagement Agreement"

            for doc in doc_list:
                doc_id = doc["documentId"]
                label = label_map.get(doc_id)
                if not label:
                    continue
                pdf_bytes = fetch_envelope_document(_envelope_id, doc_id)
                drive_file_id = upload_signed_document(pdf_bytes, label, _client_name)
                logger.info(f"Archived {label} for {_client_name} to Google Drive: {drive_file_id}")

    except Exception as e:
        logger.error(f"Google Drive archiving failed — auto-conversion unaffected: {e}")
    # --- end Google Drive archiving ---

    logger.info(
        f"Auto-convert complete: opp {opp_id} → client {new_client_id}, "
        f"engagement {new_engagement_id}"
    )


@router.get("/consent-url")
async def get_consent_url():
    """Return the DocuSign consent URL (needed for first-time setup)."""
    ds = get_docusign_service()
    return {"consent_url": ds.get_consent_url()}
