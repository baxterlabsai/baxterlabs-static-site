"""Router for deliverable pipeline — PDF conversion, send deliverables, archive.

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
import zipfile
from datetime import datetime, timezone, timedelta
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
    download_all_files_from_folder,
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
        update_engagement_status(engagement_id, "deck_complete")
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
        update_engagement_status(engagement_id, "pdfs_complete")
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

    # Compose email
    first_name = client_name.split()[0] if client_name else "there"
    body_html = f"""<p>Dear {first_name},</p>

<p>Please find attached the complete deliverable package from our profit leak diagnostic engagement with {company_name}.</p>

<p>The package includes:</p>
<ul>
    <li>Executive Summary</li>
    <li>Full Diagnostic Report</li>
    <li>Implementation Roadmap</li>
    <li>Presentation Deck</li>
    <li>Profit Leak Quantification Workbook</li>
</ul>

<p>We look forward to discussing these findings with you. Please don't hesitate to reach out with any questions.</p>

<p>Best regards,<br>
George DeVries<br>
Managing Partner, BaxterLabs Advisory<br>
george@baxterlabs.ai</p>"""

    subject = f"BaxterLabs Advisory - Diagnostic Deliverables - {company_name}"

    # Send via SMTP (same email service used by all other system emails)
    email_svc = get_email_service()
    result = email_svc.send_email_with_attachments(
        to_email=client_email,
        subject=subject,
        html_body=body_html,
        attachments=attachments,
        from_email="george@baxterlabs.ai",
        from_name="George DeVries",
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


# ============================================================================
# POST /api/engagements/{id}/archive
# ZIP all Drive files, upload to Supabase storage, create follow-ups, close.
# ============================================================================
@router.post("/engagements/{engagement_id}/archive")
async def archive_engagement(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Archive engagement: ZIP Drive files, upload to storage, create follow-ups, close."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if eng.get("status") not in ("deliverables_sent", "phase_8"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot archive — engagement status is '{eng.get('status')}', expected 'deliverables_sent' or 'phase_8'",
        )

    client = eng.get("clients", {})
    company_name = client.get("company_name", "engagement")
    safe_company = company_name.replace(" ", "_").replace("/", "_")
    now = datetime.now(timezone.utc)
    zip_filename = f"{safe_company}_{now.strftime('%Y-%m')}.zip"

    sb = get_supabase()

    # 1. Download all files from the engagement Drive folder
    root_folder_id = eng.get("drive_folder_id")
    if not root_folder_id:
        raise HTTPException(status_code=400, detail="No Drive folder configured for this engagement")

    logger.info("Downloading all files from Drive folder %s for archive", root_folder_id)
    all_files = await download_all_files_from_folder(root_folder_id)

    if not all_files:
        raise HTTPException(status_code=400, detail="No files found in Drive folder to archive")

    # 2. Create ZIP archive
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for f in all_files:
            zf.writestr(f["path"], f["bytes"])

    zip_bytes = zip_buffer.getvalue()
    logger.info("Created ZIP archive: %s (%d bytes, %d files)", zip_filename, len(zip_bytes), len(all_files))

    # 3. Upload ZIP to Supabase storage bucket 'archive'
    archive_path = f"{engagement_id}/{zip_filename}"
    try:
        sb.storage.from_("archive").upload(
            archive_path,
            zip_bytes,
            {"content-type": "application/zip"},
        )
    except Exception as e:
        logger.error("Archive upload failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Archive upload failed: {e}")

    # 4. Update engagement to closed
    sb.table("engagements").update({
        "status": "closed",
        "archived_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }).eq("id", engagement_id).execute()

    # 5. Create follow-up records (30/60/90 days)
    follow_up_ids: List[str] = []
    client_id = eng.get("client_id")
    for days in (30, 60, 90):
        scheduled = (now + timedelta(days=days)).date().isoformat()
        row = {
            "engagement_id": engagement_id,
            "client_id": client_id,
            "touchpoint": f"{days}_day_follow_up",
            "scheduled_date": scheduled,
            "status": "pending",
            "subject_template": f"BaxterLabs Advisory — {days}-Day Follow-Up — {company_name}",
            "body_template": f"{days}-day follow-up for {company_name} diagnostic engagement.",
        }
        result = sb.table("follow_up_sequences").insert(row).execute()
        if result.data:
            follow_up_ids.append(result.data[0]["id"])

    log_activity(engagement_id, "partner", "engagement_archived", {
        "archive_path": archive_path,
        "zip_size_bytes": len(zip_bytes),
        "file_count": len(all_files),
        "follow_up_ids": follow_up_ids,
    })

    return {
        "success": True,
        "archive_path": archive_path,
        "file_count": len(all_files),
        "zip_size_bytes": len(zip_bytes),
        "follow_up_ids": follow_up_ids,
    }
