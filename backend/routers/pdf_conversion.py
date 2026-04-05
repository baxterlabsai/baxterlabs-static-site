"""Router for deliverable pipeline — PDF conversion, send deliverables.

PDF CONVERSION STRATEGY: Uses Google Drive's built-in export-as-PDF instead of
LibreOffice.  The 512MB Render Starter instance cannot run LibreOffice (OOM even
on a single 2.7MB DOCX).  Google Drive handles the conversion server-side with
zero memory cost to us.  Works for DOCX, PPTX, and XLSX.
"""
from __future__ import annotations

import gc
import io
import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from middleware.auth import verify_partner_auth
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    update_engagement_status,
    log_activity,
)
from services.google_drive_engagement import (
    download_file_by_id,
    export_file_as_pdf,
    list_files_in_folder,
    upload_file_to_drive_folder,
)
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.pdf_conversion")

router = APIRouter(prefix="/api", tags=["pdf_conversion"])


# ============================================================================
# GET /api/engagements/{id}/deliverables-status
# Check Drive folder for .pptx and .pdf files — source of truth for pipeline
# progression.  Auto-advances engagement status to deck_complete when a PPTX
# is detected and status is still phase_7.
# ============================================================================
@router.get("/engagements/{engagement_id}/deliverables-status")
async def deliverables_status(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Return the current state of the deliverables pipeline based on Drive contents."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    folder_id = eng.get("drive_deliverables_folder_id")
    has_pptx = False
    pptx_filename: Optional[str] = None
    pdf_files: List[dict] = []

    if folder_id:
        all_files = await list_files_in_folder(folder_id)
        for f in all_files:
            name_lower = f["name"].lower()
            if name_lower.endswith(".pptx"):
                has_pptx = True
                pptx_filename = f["name"]
            elif name_lower.endswith(".pdf"):
                pdf_files.append({"name": f["name"], "id": f["id"]})

    # Auto-advance: if PPTX exists and status is still phase_7, move to deck_complete
    if has_pptx and eng.get("status") == "phase_7":
        sb = get_supabase()
        sb.table("engagements").update({
            "status": "deck_complete",
            "deck_built_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", engagement_id).execute()
        log_activity(engagement_id, "system", "deck_complete_auto", {
            "pptx_filename": pptx_filename,
        })

    return {
        "has_pptx": has_pptx,
        "pptx_filename": pptx_filename,
        "has_pdfs": len(pdf_files) > 0,
        "pdf_count": len(pdf_files),
        "pdf_files": pdf_files,
    }


# ============================================================================
# POST /api/engagements/{id}/convert-pdfs
# Export DOCX + PPTX files to PDF via Google Drive (zero server memory).
# DO NOT use LibreOffice — it OOMs the 512MB Render Starter instance even on
# a single 2.7MB DOCX.  Google does the conversion server-side.
# ============================================================================
@router.post("/engagements/{engagement_id}/convert-pdfs")
async def convert_pdfs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Export DOCX and PPTX files in 04_Deliverables to PDF via Google Drive."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    folder_id = eng.get("drive_deliverables_folder_id")
    if not folder_id:
        raise HTTPException(status_code=400, detail="No deliverables folder configured")

    all_files = await list_files_in_folder(folder_id)
    convertible = [
        f for f in all_files
        if f["name"].lower().endswith((".docx", ".pptx"))
    ]

    if not convertible:
        raise HTTPException(status_code=400, detail="No DOCX or PPTX files found in deliverables folder")

    sb = get_supabase()
    converted: List[dict] = []
    failed: List[dict] = []

    for drive_file in convertible:
        fname = drive_file["name"]
        try:
            # 1. Export to PDF via Google Drive (server-side, zero local memory)
            logger.info("Exporting %s to PDF via Google Drive...", fname)
            pdf_bytes = await export_file_as_pdf(drive_file["id"])
            if not pdf_bytes:
                failed.append({"file": fname, "error": "Google Drive PDF export returned empty"})
                continue

            # 2. Upload the PDF back to the same Drive folder
            pdf_filename = os.path.splitext(fname)[0] + ".pdf"
            pdf_file_id = await upload_file_to_drive_folder(
                folder_id, pdf_filename, pdf_bytes, "application/pdf",
            )
            del pdf_bytes
            gc.collect()

            if not pdf_file_id:
                failed.append({"file": fname, "error": "PDF upload to Drive failed"})
                continue

            # 3. Link to phase_output_content row
            _update_final_pdf_path(sb, engagement_id, fname, pdf_file_id)

            converted.append({"source": fname, "pdf": pdf_filename, "drive_file_id": pdf_file_id})
            logger.info("Converted %s → %s (Drive ID: %s)", fname, pdf_filename, pdf_file_id)

        except Exception as e:
            logger.error("Failed to convert %s: %s", fname, e, exc_info=True)
            failed.append({"file": fname, "error": str(e)})

    if converted:
        sb = get_supabase()
        sb.table("engagements").update({
            "status": "pdfs_complete",
            "pdfs_converted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", engagement_id).execute()
        log_activity(engagement_id, "partner", "pdfs_converted", {
            "converted_count": len(converted),
            "error_count": len(failed),
            "files": [r["source"] for r in converted],
        })

    return {
        "success": len(converted) > 0,
        "converted": converted,
        "errors": failed,
    }


def _update_final_pdf_path(sb, engagement_id: str, source_filename: str, pdf_drive_id: str):
    """Find the phase_output_content row matching this source file and set final_pdf_path.

    Matches by checking if source_filename appears in docx_path or pptx_path.
    Searches ALL phases — deliverables are stored under their original phase number
    (1, 2, 3, 4, etc.), not grouped under phase 5.
    """
    rows = (
        sb.table("phase_output_content")
        .select("id, phase_number, docx_path, pptx_path, output_name")
        .eq("engagement_id", engagement_id)
        .order("version", desc=True)
        .execute()
    )

    # Deduplicate to latest version per output_name
    seen = set()
    for row in rows.data:
        if row["output_name"] in seen:
            continue
        seen.add(row["output_name"])

        docx = row.get("docx_path") or ""
        pptx = row.get("pptx_path") or ""
        if source_filename in docx or source_filename in pptx or \
           source_filename == os.path.basename(docx) or source_filename == os.path.basename(pptx):
            sb.table("phase_output_content").update({
                "final_pdf_path": pdf_drive_id,
                "final_pdf_approved": False,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", row["id"]).execute()
            logger.info("Set final_pdf_path=%s on output %s (%s)", pdf_drive_id, row["id"], row["output_name"])
            return

    logger.warning("No phase_output_content row matched source file %s", source_filename)


# ============================================================================
# GET /api/engagements/{id}/outputs/{drive_file_id}/final-pdf-preview
# Proxy-serve a PDF from Google Drive for iframe embedding.
# The drive_file_id is passed directly from the frontend (sourced from the
# deliverables-status endpoint's pdf_files list).
# ============================================================================
@router.get("/engagements/{engagement_id}/outputs/{drive_file_id}/final-pdf-preview")
async def serve_final_pdf_preview(
    engagement_id: str,
    drive_file_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Proxy a PDF from Drive by its file ID for iframe preview."""
    # Verify the engagement exists (auth guard)
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    pdf_bytes = await download_file_by_id(drive_file_id)
    if not pdf_bytes:
        raise HTTPException(status_code=502, detail="Failed to download PDF from Google Drive")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="deliverable.pdf"'},
    )


# ============================================================================
# POST /api/engagements/{id}/send-deliverables
# Compose Gmail draft with PDF + XLSX attachments.
# ============================================================================
@router.post("/engagements/{engagement_id}/send-deliverables")
async def send_deliverables(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Create a Gmail draft with all final PDFs and the XLSX workbook attached."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    client = eng.get("clients", {})
    client_email = client.get("primary_contact_email")
    client_name = client.get("primary_contact_name", "")
    company_name = client.get("company_name", "")

    if not client_email:
        raise HTTPException(status_code=400, detail="Client has no email address on file")

    # Get PDFs directly from Google Drive deliverables folder (source of truth)
    folder_id = eng.get("drive_deliverables_folder_id")
    if not folder_id:
        raise HTTPException(status_code=400, detail="No deliverables folder configured")

    all_drive_files = await list_files_in_folder(folder_id)
    pdf_drive_files = [f for f in all_drive_files if f["name"].lower().endswith(".pdf")]
    xlsx_drive_files = [f for f in all_drive_files if f["name"].lower().endswith(".xlsx")]

    if not pdf_drive_files:
        raise HTTPException(status_code=400, detail="No PDFs found in Drive — run Create PDFs first")

    # Download all PDF attachments from Drive
    attachments: List[dict] = []
    for pdf_file in pdf_drive_files:
        pdf_bytes = await download_file_by_id(pdf_file["id"])
        if pdf_bytes:
            attachments.append({
                "filename": pdf_file["name"],
                "content": pdf_bytes,
                "mimetype": "application/pdf",
            })

    # Also attach XLSX workbook if present
    for xlsx_file in xlsx_drive_files:
        xlsx_bytes = await download_file_by_id(xlsx_file["id"])
        if xlsx_bytes:
            attachments.append({
                "filename": xlsx_file["name"],
                "content": xlsx_bytes,
                "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })

    if not attachments:
        raise HTTPException(status_code=400, detail="Could not download any attachments")

    # Look up lead partner info from pipeline_partners
    from services.email_service import get_partner_info
    partner_name = eng.get("partner_lead") or "George DeVries"
    partner = get_partner_info(partner_name)
    partner_full_name = partner.get("name", "George DeVries")
    partner_title = partner.get("title", "Partner")
    partner_email = partner.get("email", "george@baxterlabs.ai")

    first_name = client_name.split()[0] if client_name else "there"
    body_html = f"""<p>Dear {first_name},</p>

<p>Thank you for the opportunity to work with {company_name} on this engagement. As discussed during our executive debrief, please find attached the complete deliverable package from the profit leak diagnostic:</p>

<ul>
    <li>Executive Summary</li>
    <li>Full Diagnostic Report</li>
    <li>90-Day Implementation Roadmap</li>
    <li>Presentation Deck</li>
    <li>Profit Leak Quantification Workbook</li>
    <li>Retainer Proposal</li>
</ul>

<p>These documents contain the full analytical foundation, prioritized recommendations, and implementation timeline we reviewed together. The Profit Leak Quantification Workbook is the living reference for all financial figures and scenario analyses.</p>

<p>We have also included a Retainer Proposal outlining how BaxterLabs can support {company_name} through the implementation phase. If you would like to discuss implementation support or have any questions about the findings, I am happy to schedule a follow-up conversation at your convenience.</p>

<p>Best regards,<br>
{partner_full_name}<br>
{partner_title}, BaxterLabs Advisory<br>
{partner_email}</p>"""

    subject = f"BaxterLabs Advisory \u2014 Diagnostic Deliverables \u2014 {company_name}"

    # Send via SMTP (same email service used by all other system emails)
    email_svc = get_email_service()
    result = email_svc.send_email_with_attachments(
        to_email=client_email,
        subject=subject,
        html_body=body_html,
        attachments=attachments,
        from_email=partner_email,
        from_name=partner_full_name,
    )

    if not result.get("success"):
        error_msg = result.get("error", "Unknown error")
        logger.error("Deliverables email failed: %s", error_msg)
        raise HTTPException(status_code=500, detail=f"Email send failed: {error_msg}")

    # Update engagement
    now_iso = datetime.now(timezone.utc).isoformat()
    sb = get_supabase()
    sb.table("engagements").update({
        "status": "deliverables_sent",
        "deliverables_sent_at": now_iso,
        "deliverables_sent_to": client_email,
        "updated_at": now_iso,
    }).eq("id", engagement_id).execute()

    log_activity(engagement_id, "partner", "deliverables_sent", {
        "to_email": client_email,
        "attachment_count": len(attachments),
    })

    return {
        "success": True,
        "to_email": client_email,
        "attachment_count": len(attachments),
    }
