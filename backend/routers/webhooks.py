"""Stripe webhook handler — no auth, raw body for signature verification."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.stripe_service import verify_webhook_signature
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.webhooks")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """Receive Stripe webhook events — primarily checkout.session.completed.

    No auth middleware — Stripe signs the payload.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = verify_webhook_signature(payload, sig_header)
    if event is None:
        logger.warning("Stripe webhook signature verification failed or not configured")
        return Response(status_code=400)

    event_type = event.get("type", "")
    logger.info(f"Stripe webhook received: {event_type}")

    if event_type == "checkout.session.completed":
        session = event.get("data", {}).get("object", {})
        _handle_checkout_completed(session)
    elif event_type == "checkout.session.expired":
        session = event.get("data", {}).get("object", {})
        _handle_checkout_expired(session)
    else:
        logger.info(f"Unhandled Stripe event type: {event_type}")

    return Response(status_code=200)


def _handle_checkout_completed(session: dict) -> None:
    """Process a successful Stripe Checkout payment."""
    metadata = session.get("metadata", {})
    invoice_id = metadata.get("invoice_id")
    invoice_number = metadata.get("invoice_number")
    engagement_id = metadata.get("engagement_id")
    payment_intent = session.get("payment_intent")

    if not invoice_id:
        logger.warning("checkout.session.completed without invoice_id in metadata")
        return

    sb = get_supabase()

    # Update invoice status to paid
    update_data = {
        "status": "paid",
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "stripe_payment_intent_id": payment_intent,
    }
    sb.table("invoices").update(update_data).eq("id", invoice_id).execute()

    logger.info(f"Invoice {invoice_number} marked as paid via Stripe — payment_intent={payment_intent}")

    # Log activity
    if engagement_id:
        log_activity(engagement_id, "system", "payment_received", {
            "invoice_number": invoice_number,
            "invoice_id": invoice_id,
            "payment_intent": payment_intent,
            "method": "stripe",
        })

        # Send email notifications
        engagement = get_engagement_by_id(engagement_id)
        if engagement:
            email_svc = get_email_service()

            # Fetch invoice for amount
            inv_result = sb.table("invoices").select("amount").eq("id", invoice_id).execute()
            amount = float(inv_result.data[0]["amount"]) if inv_result.data else 0

            # Notify partner
            email_svc.send_payment_notification(
                engagement=engagement,
                invoice_number=invoice_number or "Unknown",
                amount=amount,
                method="stripe",
            )

            # Send receipt to client
            email_svc.send_payment_received(
                engagement=engagement,
                invoice_number=invoice_number or "Unknown",
                amount=amount,
            )


def _handle_checkout_expired(session: dict) -> None:
    """Handle expired Stripe Checkout session — log for awareness."""
    metadata = session.get("metadata", {})
    invoice_number = metadata.get("invoice_number")
    engagement_id = metadata.get("engagement_id")

    if engagement_id:
        log_activity(engagement_id, "system", "stripe_checkout_expired", {
            "invoice_number": invoice_number,
        })

    logger.info(f"Stripe checkout expired for invoice {invoice_number}")
