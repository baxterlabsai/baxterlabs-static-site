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
        result = ds.send_nda(
            engagement_id=body.engagement_id,
            contact_email=contact_email,
            contact_name=contact_name,
            company_name=company_name,
        )
    except RuntimeError as e:
        logger.error(f"DocuSign send_nda error: {e}")
        raise HTTPException(status_code=503, detail=str(e))

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
                email_svc.send_nda_signed_notification(engagement)

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
                email_svc.send_agreement_signed_notification(engagement)
                # Send upload link to client
                email_svc.send_upload_link(engagement)

            logger.info(f"Agreement signed — envelope={envelope_id} engagement={engagement_id}")

    return Response(status_code=200)


@router.get("/consent-url")
async def get_consent_url():
    """Return the DocuSign consent URL (needed for first-time setup)."""
    ds = get_docusign_service()
    return {"consent_url": ds.get_consent_url()}
