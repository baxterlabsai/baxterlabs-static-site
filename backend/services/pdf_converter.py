from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from typing import Optional

logger = logging.getLogger("baxterlabs.pdf_converter")


class ConversionError(Exception):
    """Raised when LibreOffice PDF conversion fails."""


async def convert_to_pdf(source_bytes: bytes, source_ext: str) -> bytes:
    """Convert .docx or .pptx bytes to PDF using LibreOffice headless.

    Args:
        source_bytes: Raw file content.
        source_ext: Extension including dot, e.g. ".docx".

    Returns:
        PDF file bytes.

    Raises:
        ConversionError: If conversion fails for any reason.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        source_file = os.path.join(tmpdir, f"source{source_ext}")
        with open(source_file, "wb") as f:
            f.write(source_bytes)

        result = subprocess.run(
            [
                "libreoffice",
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                tmpdir,
                source_file,
            ],
            capture_output=True,
            timeout=120,
        )

        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            logger.error(f"LibreOffice conversion failed: {stderr}")
            raise ConversionError(f"LibreOffice exited with code {result.returncode}: {stderr}")

        pdf_path = os.path.join(tmpdir, "source.pdf")
        if not os.path.exists(pdf_path):
            raise ConversionError("LibreOffice did not produce a PDF output file")

        with open(pdf_path, "rb") as f:
            return f.read()


async def convert_and_upload_pdf(
    sb,
    source_storage_path: str,
    engagement_id: str,
    deliverable_id: str,
    deliverable_type: str,
) -> str:
    """Download a deliverable from Supabase, convert to PDF, upload, and update the record.

    Args:
        sb: Supabase client instance.
        source_storage_path: Path in the 'engagements' bucket.
        engagement_id: Engagement UUID.
        deliverable_id: Deliverable UUID.
        deliverable_type: e.g. "exec_summary", "deck".

    Returns:
        The storage path of the uploaded PDF.

    Raises:
        ConversionError: If download, conversion, or upload fails.
    """
    # Download source file
    try:
        source_bytes = sb.storage.from_("engagements").download(source_storage_path)
    except Exception as e:
        raise ConversionError(f"Failed to download source file: {e}")

    # Determine extension from storage path
    _, ext = os.path.splitext(source_storage_path)
    if not ext:
        raise ConversionError(f"Cannot determine extension from path: {source_storage_path}")

    # Convert
    pdf_bytes = await convert_to_pdf(source_bytes, ext)

    # Upload PDF
    pdf_filename = f"{deliverable_type}_final.pdf"
    pdf_storage_path = f"{engagement_id}/deliverables/{pdf_filename}"

    try:
        # Remove existing PDF if present
        try:
            sb.storage.from_("engagements").remove([pdf_storage_path])
        except Exception:
            pass

        sb.storage.from_("engagements").upload(
            pdf_storage_path,
            pdf_bytes,
            {"content-type": "application/pdf"},
        )
    except Exception as e:
        raise ConversionError(f"Failed to upload PDF: {e}")

    # Update deliverable record
    sb.table("deliverables").update({
        "pdf_storage_path": pdf_storage_path,
        "pdf_filename": pdf_filename,
        "format": "pdf",
    }).eq("id", deliverable_id).execute()

    logger.info(f"Converted and uploaded PDF for {deliverable_type}: {pdf_storage_path}")
    return pdf_storage_path
