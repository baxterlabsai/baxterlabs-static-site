"""Invoice CRUD, generation, and business logic endpoints."""

from __future__ import annotations

import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.stripe_service import create_checkout_session
from services.invoice_pdf import generate_invoice_pdf
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.invoices")

router = APIRouter(prefix="/api", tags=["invoices"])

VALID_INVOICE_STATUSES = {"draft", "sent", "paid", "voided", "overdue"}


# ── Helpers ──────────────────────────────────────────────────────────────

def generate_invoice_number() -> str:
    """Generate next sequential invoice number: BL-{YEAR}-{NNN}."""
    sb = get_supabase()
    year = date.today().year
    prefix = f"BL-{year}-"

    # Find the highest existing number for this year
    result = (
        sb.table("invoices")
        .select("invoice_number")
        .ilike("invoice_number", f"{prefix}%")
        .order("invoice_number", desc=True)
        .limit(1)
        .execute()
    )

    if result.data:
        last_num = result.data[0]["invoice_number"]
        try:
            seq = int(last_num.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1

    return f"{prefix}{seq:03d}"


def create_and_send_invoice(
    engagement_id: str,
    invoice_type: str,
    send_email: bool = True,
) -> dict:
    """Create an invoice record, generate PDF, create Stripe session, send email.

    Args:
        engagement_id: The engagement to invoice.
        invoice_type: 'deposit' or 'final'.
        send_email: Whether to send the invoice email to the client.

    Returns:
        The created invoice record dict.
    """
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise ValueError(f"Engagement {engagement_id} not found")

    client = engagement.get("clients", {})
    fee = float(engagement.get("fee") or 12500)
    amount = fee / 2  # 50% split

    # Check for duplicate invoice
    existing = (
        sb.table("invoices")
        .select("id")
        .eq("engagement_id", engagement_id)
        .eq("type", invoice_type)
        .neq("status", "voided")
        .execute()
    )
    if existing.data:
        logger.warning(f"Non-voided {invoice_type} invoice already exists for engagement {engagement_id}")
        return existing.data[0]

    invoice_number = generate_invoice_number()
    issued_at = date.today().isoformat()
    due_date = (date.today() + timedelta(days=14)).isoformat()

    # 1. Create Stripe Checkout Session
    session = create_checkout_session(
        invoice_id="pending",  # Will update after insert
        engagement_id=engagement_id,
        invoice_number=invoice_number,
        invoice_type=invoice_type,
        amount=amount,
        company_name=client.get("company_name", "Unknown"),
    )

    payment_link = session.url if session else None
    stripe_session_id = session.id if session else None

    # 2. Generate PDF
    pdf_bytes = generate_invoice_pdf(
        invoice_number=invoice_number,
        invoice_type=invoice_type,
        amount=amount,
        issued_at=issued_at,
        due_date=due_date,
        company_name=client.get("company_name", "Unknown"),
        contact_name=client.get("primary_contact_name", "Client"),
        contact_email=client.get("primary_contact_email", ""),
        engagement_fee=fee,
        payment_link=payment_link,
    )

    # 3. Upload PDF to Supabase Storage
    pdf_path = f"{engagement_id}/invoices/{invoice_number}.pdf"
    try:
        sb.storage.from_("engagements").upload(
            pdf_path,
            pdf_bytes,
            {"content-type": "application/pdf"},
        )
    except Exception as e:
        logger.warning(f"PDF upload failed (non-blocking): {e}")
        pdf_path = None

    # 4. Insert invoice record
    invoice_row = {
        "engagement_id": engagement_id,
        "invoice_number": invoice_number,
        "type": invoice_type,
        "amount": amount,
        "status": "sent",
        "stripe_checkout_session_id": stripe_session_id,
        "payment_link": payment_link,
        "pdf_storage_path": pdf_path,
        "issued_at": issued_at,
        "due_date": due_date,
    }
    result = sb.table("invoices").insert(invoice_row).execute()
    invoice = result.data[0]

    # 5. Update Stripe session metadata with real invoice ID
    if session and invoice.get("id"):
        try:
            import stripe
            stripe.checkout.Session.modify(
                session.id,
                metadata={
                    "invoice_id": str(invoice["id"]),
                    "engagement_id": str(engagement_id),
                    "invoice_number": invoice_number,
                },
            )
        except Exception as e:
            logger.warning(f"Failed to update Stripe session metadata: {e}")

    # 6. Send email
    if send_email:
        email_svc = get_email_service()
        email_result = email_svc.send_invoice(
            engagement=engagement,
            invoice_number=invoice_number,
            invoice_type=invoice_type,
            amount=amount,
            due_date=due_date,
            payment_link=payment_link,
        )
        log_activity(engagement_id, "system", "invoice_email_sent", {
            "invoice_number": invoice_number,
            "type": invoice_type,
            "to": client.get("primary_contact_email"),
            "result": email_result,
        })

    # 7. Log activity
    log_activity(engagement_id, "system", "invoice_created", {
        "invoice_number": invoice_number,
        "type": invoice_type,
        "amount": amount,
        "payment_link": payment_link,
    })

    logger.info(f"Invoice created: {invoice_number} ({invoice_type}) for engagement {engagement_id}")
    return invoice


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/invoices/revenue-summary")
async def revenue_summary(user: dict = Depends(verify_partner_auth)):
    """Revenue summary: total invoiced, paid, outstanding, overdue."""
    sb = get_supabase()
    invoices = sb.table("invoices").select("amount, status, type").execute()

    total_invoiced = 0.0
    total_paid = 0.0
    total_outstanding = 0.0
    total_overdue = 0.0
    deposit_count = 0
    final_count = 0

    for inv in invoices.data:
        amt = float(inv.get("amount") or 0)
        status = inv.get("status")
        if status == "voided":
            continue
        total_invoiced += amt
        if status == "paid":
            total_paid += amt
        elif status in ("sent", "overdue"):
            total_outstanding += amt
        if status == "overdue":
            total_overdue += amt
        if inv.get("type") == "deposit":
            deposit_count += 1
        elif inv.get("type") == "final":
            final_count += 1

    return {
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "total_overdue": total_overdue,
        "invoice_count": len(invoices.data),
        "deposit_count": deposit_count,
        "final_count": final_count,
    }


@router.get("/invoices/check-overdue")
async def check_overdue(user: dict = Depends(verify_partner_auth)):
    """Find sent invoices past their due date and mark them overdue."""
    sb = get_supabase()
    today_str = date.today().isoformat()

    overdue = (
        sb.table("invoices")
        .select("id, invoice_number, engagement_id, due_date, amount")
        .eq("status", "sent")
        .lt("due_date", today_str)
        .execute()
    )

    updated = []
    for inv in overdue.data:
        sb.table("invoices").update({"status": "overdue"}).eq("id", inv["id"]).execute()
        log_activity(inv["engagement_id"], "system", "invoice_overdue", {
            "invoice_number": inv["invoice_number"],
            "due_date": inv["due_date"],
            "amount": float(inv["amount"]),
        })
        updated.append(inv["invoice_number"])

    return {
        "overdue_count": len(updated),
        "updated_invoices": updated,
    }


@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List all invoices with engagement/client info."""
    sb = get_supabase()
    query = sb.table("invoices").select("*, engagements(id, fee, status, clients(company_name, primary_contact_name, primary_contact_email))")
    if status:
        if status not in VALID_INVOICE_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return {"invoices": result.data, "count": len(result.data)}


@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(verify_partner_auth)):
    """Get a single invoice with full details."""
    sb = get_supabase()
    result = (
        sb.table("invoices")
        .select("*, engagements(id, fee, status, clients(company_name, primary_contact_name, primary_contact_email))")
        .eq("id", invoice_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result.data[0]


@router.get("/engagements/{engagement_id}/invoices")
async def get_engagement_invoices(engagement_id: str, user: dict = Depends(verify_partner_auth)):
    """Get all invoices for a specific engagement."""
    sb = get_supabase()
    result = (
        sb.table("invoices")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"invoices": result.data, "count": len(result.data)}


@router.post("/invoices/{invoice_id}/resend")
async def resend_invoice(invoice_id: str, user: dict = Depends(verify_partner_auth)):
    """Resend the invoice email to the client."""
    sb = get_supabase()
    result = sb.table("invoices").select("*").eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = result.data[0]

    if invoice["status"] == "voided":
        raise HTTPException(status_code=400, detail="Cannot resend a voided invoice")

    engagement = get_engagement_by_id(invoice["engagement_id"])
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    email_svc = get_email_service()
    email_result = email_svc.send_invoice(
        engagement=engagement,
        invoice_number=invoice["invoice_number"],
        invoice_type=invoice["type"],
        amount=float(invoice["amount"]),
        due_date=invoice["due_date"],
        payment_link=invoice.get("payment_link"),
    )

    log_activity(invoice["engagement_id"], "partner", "invoice_resent", {
        "invoice_number": invoice["invoice_number"],
        "result": email_result,
    })

    return {"success": True, "email_result": email_result}


@router.post("/invoices/{invoice_id}/void")
async def void_invoice(invoice_id: str, user: dict = Depends(verify_partner_auth)):
    """Void an invoice (cannot be undone)."""
    sb = get_supabase()
    result = sb.table("invoices").select("*").eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = result.data[0]

    if invoice["status"] == "paid":
        raise HTTPException(status_code=400, detail="Cannot void a paid invoice")
    if invoice["status"] == "voided":
        raise HTTPException(status_code=400, detail="Invoice is already voided")

    sb.table("invoices").update({
        "status": "voided",
        "voided_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", invoice_id).execute()

    log_activity(invoice["engagement_id"], "partner", "invoice_voided", {
        "invoice_number": invoice["invoice_number"],
    })

    return {"success": True, "message": f"Invoice {invoice['invoice_number']} voided"}


@router.post("/invoices/{invoice_id}/mark-paid")
async def mark_paid(invoice_id: str, user: dict = Depends(verify_partner_auth)):
    """Manually mark an invoice as paid (e.g. check or wire received)."""
    sb = get_supabase()
    result = sb.table("invoices").select("*").eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = result.data[0]

    if invoice["status"] == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already paid")
    if invoice["status"] == "voided":
        raise HTTPException(status_code=400, detail="Cannot mark a voided invoice as paid")

    sb.table("invoices").update({
        "status": "paid",
        "paid_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", invoice_id).execute()

    log_activity(invoice["engagement_id"], "partner", "invoice_marked_paid", {
        "invoice_number": invoice["invoice_number"],
        "amount": float(invoice["amount"]),
        "method": "manual",
    })

    # Send payment confirmation to partner
    engagement = get_engagement_by_id(invoice["engagement_id"])
    if engagement:
        email_svc = get_email_service()
        email_svc.send_payment_notification(
            engagement=engagement,
            invoice_number=invoice["invoice_number"],
            amount=float(invoice["amount"]),
            method="manual",
        )

    return {"success": True, "message": f"Invoice {invoice['invoice_number']} marked as paid"}


@router.get("/invoices/{invoice_id}/download")
async def download_invoice_pdf(invoice_id: str, user: dict = Depends(verify_partner_auth)):
    """Generate a signed download URL for the invoice PDF."""
    sb = get_supabase()
    result = sb.table("invoices").select("pdf_storage_path, invoice_number").eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = result.data[0]

    if not invoice.get("pdf_storage_path"):
        raise HTTPException(status_code=404, detail="PDF not available for this invoice")

    try:
        signed = sb.storage.from_("engagements").create_signed_url(invoice["pdf_storage_path"], 3600)
        return {
            "success": True,
            "url": signed.get("signedURL") or signed.get("signedUrl", ""),
            "filename": f"{invoice['invoice_number']}.pdf",
        }
    except Exception as e:
        logger.error(f"Failed to create signed URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")


class ManualInvoiceInput(BaseModel):
    invoice_type: str  # 'deposit' or 'final'
    send_email: bool = True


@router.post("/engagements/{engagement_id}/generate-invoice")
async def generate_invoice(
    engagement_id: str,
    body: ManualInvoiceInput,
    user: dict = Depends(verify_partner_auth),
):
    """Manually generate an invoice for an engagement."""
    if body.invoice_type not in ("deposit", "final"):
        raise HTTPException(status_code=400, detail="invoice_type must be 'deposit' or 'final'")

    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    try:
        invoice = create_and_send_invoice(
            engagement_id=engagement_id,
            invoice_type=body.invoice_type,
            send_email=body.send_email,
        )
        return {"success": True, "invoice": invoice}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Invoice generation failed: {e}")
        raise HTTPException(status_code=500, detail="Invoice generation failed")
