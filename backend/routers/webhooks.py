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


# ---------------------------------------------------------------------------
# Calendly Webhook
# ---------------------------------------------------------------------------

@router.post("/calendly")
async def calendly_webhook(request: Request):
    """Receive Calendly webhook events — primarily invitee.created.

    No auth middleware — Calendly signs the payload.
    """
    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=400)

    event_type = payload.get("event", "")
    logger.info(f"Calendly webhook received: {event_type}")

    if event_type == "invitee.created":
        _handle_calendly_invitee_created(payload)

    return Response(status_code=200)


def _handle_calendly_invitee_created(payload: dict) -> None:
    """Match a Calendly booking to a pipeline opportunity and store details."""
    data = payload.get("payload", {})
    invitee_email = data.get("email", "").lower().strip()
    invitee_name = data.get("name", "")
    event_uri = data.get("event", "")
    invitee_uri = data.get("uri", "")

    # Extract scheduled time from the event
    scheduled_event = data.get("scheduled_event", {})
    start_time = scheduled_event.get("start_time", "")

    if not invitee_email:
        logger.warning("Calendly invitee.created without email — skipping")
        return

    sb = get_supabase()

    # Find opportunity: contact email matches + stage = discovery_scheduled
    contacts = (
        sb.table("pipeline_contacts")
        .select("id, company_id, name")
        .ilike("email", invitee_email)
        .eq("is_deleted", False)
        .execute()
    )
    if not contacts.data:
        logger.info(f"Calendly booking for {invitee_email} — no matching pipeline contact")
        return

    contact_ids = [c["id"] for c in contacts.data]

    # Check for opportunities in discovery_scheduled stage with matching contact
    for contact_id in contact_ids:
        opps = (
            sb.table("pipeline_opportunities")
            .select("id, nda_confirmation_token, assigned_to, company_id")
            .eq("primary_contact_id", contact_id)
            .eq("stage", "discovery_scheduled")
            .eq("is_deleted", False)
            .execute()
        )
        if opps.data:
            opp = opps.data[0]
            # Store Calendly details on the opportunity
            sb.table("pipeline_opportunities").update({
                "calendly_event_uri": event_uri,
                "calendly_invitee_uri": invitee_uri,
                "calendly_booking_time": start_time,
            }).eq("id", opp["id"]).execute()

            logger.info(f"Calendly booking matched to opportunity {opp['id']} for {invitee_email}")

            # No intermediate email needed — prospect is already on the /schedule page
            # which transitions to the NDA card after the booking is confirmed.
            return

    logger.info(f"Calendly booking for {invitee_email} — no matching discovery_scheduled opportunity")
