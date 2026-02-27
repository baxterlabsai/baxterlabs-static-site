"""Stripe integration — Checkout session creation and webhook verification."""

from __future__ import annotations

import os
import logging
from typing import Optional

import stripe

logger = logging.getLogger("baxterlabs.stripe")

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://baxterlabs.ai")


def create_checkout_session(
    invoice_id: str,
    engagement_id: str,
    invoice_number: str,
    invoice_type: str,
    amount: float,
    company_name: str,
) -> Optional[stripe.checkout.Session]:
    """Create a Stripe Checkout Session for an invoice.

    Returns the session object (caller stores session.url and session.id).
    Returns None if Stripe is not configured.
    """
    if not stripe.api_key:
        logger.info("Stripe not configured — skipping checkout session creation")
        return None

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"BaxterLabs Diagnostic — {invoice_type.title()} Invoice",
                            "description": f"Invoice {invoice_number} for {company_name}",
                        },
                        "unit_amount": int(amount * 100),
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=f"{FRONTEND_URL}/payment/success?invoice={invoice_id}",
            cancel_url=f"{FRONTEND_URL}/payment/cancelled?invoice={invoice_id}",
            metadata={
                "invoice_id": str(invoice_id),
                "engagement_id": str(engagement_id),
                "invoice_number": invoice_number,
            },
        )
        logger.info(f"Stripe checkout session created — invoice={invoice_number} session_id={session.id}")
        return session
    except stripe.StripeError as e:
        logger.error(f"Stripe checkout session creation failed: {e}")
        return None


def verify_webhook_signature(payload: bytes, sig_header: str) -> Optional[dict]:
    """Verify Stripe webhook signature and return the parsed event.

    Returns None if verification fails.
    """
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured — cannot verify webhook")
        return None

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        return event
    except stripe.SignatureVerificationError as e:
        logger.error(f"Stripe webhook signature verification failed: {e}")
        return None
    except ValueError as e:
        logger.error(f"Stripe webhook payload invalid: {e}")
        return None
