"""Router for deliverable pipeline — PDF conversion, send deliverables, archive."""
from __future__ import annotations

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
    download_file_by_name,
    list_files_in_folder,
    upload_file_to_drive_folder,
    download_all_files_from_folder,
)
from services.pdf_converter import convert_to_pdf, ConversionError
from services.gmail_service import create_gmail_draft_with_attachments

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
    pdf_filenames: List[str] = []

    if folder_id:
        all_files = await list_files_in_folder(folder_id)
        for f in all_files:
            name_lower = f["name"].lower()
            if name_lower.endswith(".pptx"):
                has_pptx = True
                pptx_filename = f["name"]
            elif name_lower.endswith(".pdf"):
                pdf_filenames.append(f["name"])

    # Auto-advance: if PPTX exists and status is still phase_7, move to deck_complete
    if has_pptx and eng.get("status") == "phase_7":
        update_engagement_status(engagement_id, "deck_complete")
        log_activity(engagement_id, "system", "deck_complete_auto", {
            "pptx_filename": pptx_filename,
        })

    return {
        "has_pptx": has_pptx,
        "pptx_filename": pptx_filename,
        "has_pdfs": len(pdf_filenames) > 0,
        "pdf_count": len(pdf_filenames),
        "pdf_filenames": pdf_filenames,
    }


# ============================================================================
# POST /api/engagements/{id}/convert-pdfs
# Download DOCX/PPTX from Drive 04_Deliverables, convert to PDF, upload back.
# ============================================================================
@router.post("/engagements/{engagement_id}/convert-pdfs")
async def convert_pdfs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Convert all DOCX and PPTX files in 04_Deliverables to PDF."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    folder_id = eng.get("drive_deliverables_folder_id")
    if not folder_id:
        raise HTTPException(status_code=400, detail="No deliverables folder configured")

    # List all files in the deliverables folder
    all_files = await list_files_in_folder(folder_id)
    convertible = [
        f for f in all_files
        if f["name"].lower().endswith((".docx", ".pptx"))
    ]

    if not convertible:
        raise HTTPException(status_code=400, detail="No DOCX or PPTX files found in deliverables folder")

    sb = get_supabase()
    results: List[dict] = []
    errors: List[dict] = []

    for drive_file in convertible:
        fname = drive_file["name"]
        try:
            # 1. Download from Drive
            source_bytes = await download_file_by_id(drive_file["id"])
            if not source_bytes:
                errors.append({"file": fname, "error": "Download failed"})
                continue

            # 2. Convert to PDF via LibreOffice
            ext = os.path.splitext(fname)[1].lower()
            pdf_bytes = await convert_to_pdf(source_bytes, ext)

            # 3. Upload PDF back to same Drive folder
            pdf_filename = os.path.splitext(fname)[0] + ".pdf"
            pdf_file_id = await upload_file_to_drive_folder(
                folder_id, pdf_filename, pdf_bytes, "application/pdf",
            )
            if not pdf_file_id:
                errors.append({"file": fname, "error": "PDF upload to Drive failed"})
                continue

            # 4. Update phase_output_content row — match by docx_path or pptx_path filename
            _update_final_pdf_path(sb, engagement_id, fname, pdf_file_id)

            results.append({
                "source": fname,
                "pdf": pdf_filename,
                "drive_file_id": pdf_file_id,
            })
            logger.info("Converted %s → %s (Drive ID: %s)", fname, pdf_filename, pdf_file_id)

        except ConversionError as e:
            logger.error("Conversion failed for %s: %s", fname, e)
            errors.append({"file": fname, "error": str(e)})
        except Exception as e:
            logger.error("Unexpected error converting %s: %s", fname, e, exc_info=True)
            errors.append({"file": fname, "error": str(e)})

    # Update engagement status
    if results:
        update_engagement_status(engagement_id, "pdfs_complete")
        log_activity(engagement_id, "partner", "pdfs_converted", {
            "converted_count": len(results),
            "error_count": len(errors),
            "files": [r["source"] for r in results],
        })

    return {
        "success": len(results) > 0,
        "converted": results,
        "errors": errors,
    }


def _update_final_pdf_path(sb, engagement_id: str, source_filename: str, pdf_drive_id: str):
    """Find the phase_output_content row matching this source file and set final_pdf_path."""
    # Match by docx_path or pptx_path containing the filename
    rows = (
        sb.table("phase_output_content")
        .select("id, docx_path, pptx_path, output_name")
        .eq("engagement_id", engagement_id)
        .eq("phase_number", 5)
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
        # Match if the source filename appears in either path
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
# GET /api/engagements/{id}/outputs/{output_id}/final-pdf-preview
# Proxy-serve a final PDF from Google Drive for iframe embedding.
# ============================================================================
@router.get("/engagements/{engagement_id}/outputs/{output_id}/final-pdf-preview")
async def serve_final_pdf_preview(
    engagement_id: str,
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Proxy the final PDF from Drive for iframe preview."""
    sb = get_supabase()

    row = sb.table("phase_output_content").select(
        "id, final_pdf_path, output_name"
    ).eq("id", output_id).single().execute()

    if not row.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = row.data
    file_id = rec.get("final_pdf_path")
    if not file_id:
        raise HTTPException(status_code=404, detail="No final PDF generated for this output")

    if file_id.startswith("http") or "/" in file_id or "." in file_id:
        raise HTTPException(status_code=400, detail="final_pdf_path is not a Drive file ID")

    pdf_bytes = await download_file_by_id(file_id)
    if not pdf_bytes:
        raise HTTPException(status_code=502, detail="Failed to download PDF from Google Drive")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{rec.get("output_name", "deliverable")}.pdf"'},
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

    sb = get_supabase()

    # Get final PDF deliverables (Phase 5 outputs with final_pdf_path)
    pdf_rows = (
        sb.table("phase_output_content")
        .select("id, output_name, output_number, final_pdf_path")
        .eq("engagement_id", engagement_id)
        .eq("phase_number", 5)
        .not_.is_("final_pdf_path", "null")
        .order("output_number")
        .execute()
    )

    # Deduplicate to latest per output_name
    seen = set()
    pdf_outputs = []
    for row in pdf_rows.data:
        if row["output_name"] not in seen:
            seen.add(row["output_name"])
            pdf_outputs.append(row)

    if not pdf_outputs:
        raise HTTPException(status_code=400, detail="No final PDFs found — run Create PDFs first")

    # Download all PDF attachments from Drive
    attachments: List[dict] = []
    for out in pdf_outputs:
        pdf_bytes = await download_file_by_id(out["final_pdf_path"])
        if pdf_bytes:
            safe_name = out["output_name"].replace(" ", "_")
            attachments.append({
                "filename": f"{safe_name}_{company_name.replace(' ', '_')}.pdf",
                "content": pdf_bytes,
                "mimetype": "application/pdf",
            })

    # Also get the XLSX workbook if available
    # Check phase_output_content for xlsx first, then engagement-level
    xlsx_rows = (
        sb.table("phase_output_content")
        .select("xlsx_path, xlsx_link, output_name")
        .eq("engagement_id", engagement_id)
        .eq("phase_number", 5)
        .not_.is_("xlsx_path", "null")
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    xlsx_drive_id = None
    xlsx_name = "Profit_Leak_Quantification_Workbook"
    if xlsx_rows.data:
        xlsx_drive_id = xlsx_rows.data[0].get("xlsx_path")
        xlsx_name = xlsx_rows.data[0].get("output_name", xlsx_name).replace(" ", "_")

    if xlsx_drive_id and not xlsx_drive_id.startswith("http"):
        xlsx_bytes = await download_file_by_id(xlsx_drive_id)
        if xlsx_bytes:
            attachments.append({
                "filename": f"{xlsx_name}_{company_name.replace(' ', '_')}.xlsx",
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

    try:
        draft_id = create_gmail_draft_with_attachments(
            to_email=client_email,
            to_name=client_name,
            subject=subject,
            body_html=body_html,
            attachments=attachments,
        )
    except Exception as e:
        logger.error("Gmail draft creation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gmail draft creation failed: {e}")

    # Update engagement
    now_iso = datetime.now(timezone.utc).isoformat()
    sb.table("engagements").update({
        "status": "deliverables_sent",
        "deliverables_sent_at": now_iso,
        "deliverables_sent_to": client_email,
        "updated_at": now_iso,
    }).eq("id", engagement_id).execute()

    log_activity(engagement_id, "partner", "deliverables_sent", {
        "draft_id": draft_id,
        "to_email": client_email,
        "attachment_count": len(attachments),
    })

    return {
        "success": True,
        "draft_id": draft_id,
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
