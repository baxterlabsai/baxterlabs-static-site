from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from middleware.auth import verify_partner_auth, verify_deliverable_token
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    get_engagement_by_deliverable_token,
    update_engagement_status,
    log_activity,
)
from services.email_service import get_email_service
from services.pdf_converter import convert_and_upload_pdf, ConversionError

logger = logging.getLogger("baxterlabs.deliverables")

router = APIRouter(prefix="/api", tags=["deliverables"])

# ── Constants ───────────────────────────────────────────────────────────────

DELIVERABLE_TYPES = {
    1: [
        ("exec_summary", "Executive Summary"),
        ("full_report", "Full Diagnostic Report"),
        ("workbook", "Profit Leak Workbook"),
        ("roadmap", "90-Day Implementation Roadmap"),
    ],
    2: [
        ("deck", "Presentation Deck"),
        ("retainer_proposal", "Phase 2 Retainer Proposal"),
    ],
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".pptx", ".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ── Helpers ─────────────────────────────────────────────────────────────────

def _signed_url_from_result(result: dict) -> Optional[str]:
    """Extract signed URL from Supabase create_signed_url response."""
    return result.get("signedURL") or result.get("signedUrl")


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/deliverables/{token}")
async def get_deliverables_by_token(token: str):
    """Get released deliverables for client portal via token (public, no auth)."""
    engagement = get_engagement_by_deliverable_token(token)
    if not engagement:
        raise HTTPException(status_code=404, detail="Invalid or expired deliverable token")

    # Check token expiry — 30 days from engagement creation
    created_at_str = engagement.get("created_at", "")
    try:
        # Parse ISO 8601 timestamp; handle both +00:00 and Z suffixes
        if created_at_str.endswith("Z"):
            created_at_str = created_at_str[:-1] + "+00:00"
        created_at = datetime.fromisoformat(created_at_str)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - created_at > timedelta(days=30):
            return {
                "expired": True,
                "message": "This deliverable link has expired. Please contact BaxterLabs for a new link.",
            }
    except (ValueError, TypeError):
        logger.warning(f"Could not parse created_at for engagement {engagement.get('id')}: {created_at_str}")

    sb = get_supabase()
    engagement_id = engagement["id"]

    # Fetch ALL deliverables for this engagement
    all_deliverables = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", engagement_id)
        .execute()
    )

    wave_1 = []
    wave_2 = []

    for d in all_deliverables.data:
        if d.get("status") != "released":
            continue

        # Prefer PDF for non-workbook deliverables
        if d.get("type") != "workbook" and d.get("pdf_storage_path"):
            storage_path = d["pdf_storage_path"]
        else:
            storage_path = d.get("storage_path")

        if storage_path:
            try:
                result = sb.storage.from_("engagements").create_signed_url(storage_path, 3600)
                d["signed_url"] = _signed_url_from_result(result)
            except Exception as e:
                logger.error(f"Failed to create signed URL for {storage_path}: {e}")
                d["signed_url"] = None
        else:
            d["signed_url"] = None

        if d.get("wave") == 1:
            wave_1.append(d)
        elif d.get("wave") == 2:
            wave_2.append(d)

    client = engagement.get("clients", {})

    return {
        "company_name": client.get("company_name", ""),
        "engagement_id": engagement_id,
        "start_date": engagement.get("start_date"),
        "target_end_date": engagement.get("target_end_date"),
        "wave_1": wave_1,
        "wave_2": wave_2,
    }


@router.post("/engagements/{engagement_id}/deliverables/ensure")
async def ensure_deliverables(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Create the 6 standard deliverable records for an engagement if they don't exist."""
    sb = get_supabase()

    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Check existing deliverables
    existing = (
        sb.table("deliverables")
        .select("id")
        .eq("engagement_id", engagement_id)
        .execute()
    )

    if len(existing.data) < 6:
        # Delete any partial set and recreate all 6
        if existing.data:
            sb.table("deliverables").delete().eq("engagement_id", engagement_id).execute()

        rows = []
        for wave_num, types in DELIVERABLE_TYPES.items():
            for dtype, display_name in types:
                rows.append({
                    "engagement_id": engagement_id,
                    "type": dtype,
                    "wave": wave_num,
                    "status": "draft",
                })

        result = sb.table("deliverables").insert(rows).execute()
        logger.info(f"Created {len(result.data)} deliverables for engagement {engagement_id}")
        return {"success": True, "created": True, "deliverables": result.data}

    # Already have 6+
    all_deliverables = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    return {"success": True, "created": False, "deliverables": all_deliverables.data}


@router.post("/engagements/{engagement_id}/deliverables/{deliverable_id}/upload")
async def upload_deliverable(
    engagement_id: str,
    deliverable_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_partner_auth),
):
    """Upload a file for a specific deliverable. Requires partner auth."""
    sb = get_supabase()

    # Verify the deliverable belongs to this engagement
    deliverable_result = (
        sb.table("deliverables")
        .select("*")
        .eq("id", deliverable_id)
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if not deliverable_result.data:
        raise HTTPException(status_code=404, detail="Deliverable not found for this engagement")

    deliverable = deliverable_result.data[0]

    # Validate file extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read file content and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    # Build storage path
    deliverable_type = deliverable.get("type", "unknown")
    storage_path = f"{engagement_id}/deliverables/{deliverable_type}{ext}"

    # Delete old file if one exists
    old_path = deliverable.get("storage_path")
    if old_path:
        try:
            sb.storage.from_("engagements").remove([old_path])
        except Exception as e:
            logger.warning(f"Failed to delete old file {old_path}: {e}")

    # Upload to Supabase Storage
    try:
        content_type = file.content_type or "application/octet-stream"
        sb.storage.from_("engagements").upload(
            storage_path,
            content,
            {"content-type": content_type},
        )
    except Exception as e:
        logger.error(f"Storage upload failed for {storage_path}: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {e}")

    # Update deliverable record
    updated = (
        sb.table("deliverables")
        .update({
            "storage_path": storage_path,
            "filename": filename,
        })
        .eq("id", deliverable_id)
        .execute()
    )

    log_activity(engagement_id, "partner", "deliverable_uploaded", {
        "deliverable_id": deliverable_id,
        "deliverable_type": deliverable_type,
        "filename": filename,
    })

    logger.info(f"Uploaded deliverable {deliverable_type} for engagement {engagement_id}: {filename}")
    return {"success": True, "deliverable": updated.data[0] if updated.data else deliverable}


@router.put("/deliverables/{deliverable_id}/approve")
async def approve_deliverable(
    deliverable_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Mark a deliverable as approved. Requires partner auth."""
    sb = get_supabase()

    # Fetch the deliverable first
    existing = sb.table("deliverables").select("*").eq("id", deliverable_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    deliverable = existing.data[0]

    # Cannot approve without an uploaded file
    if not deliverable.get("storage_path"):
        raise HTTPException(
            status_code=400,
            detail="Cannot approve a deliverable without an uploaded file",
        )

    result = (
        sb.table("deliverables")
        .update({
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", deliverable_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Deliverable not found")

    updated = result.data[0]

    log_activity(
        updated.get("engagement_id"),
        "partner",
        "deliverable_approved",
        {
            "deliverable_id": deliverable_id,
            "deliverable_type": updated.get("type", ""),
        },
    )

    return {"success": True, "deliverable": updated}


@router.post("/engagements/{engagement_id}/release-wave1")
async def release_wave1(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Release Wave 1 deliverables to client. Requires partner auth."""
    sb = get_supabase()
    email_svc = get_email_service()

    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Check all Wave 1 deliverables are approved
    wave1 = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("wave", 1)
        .execute()
    )

    if not wave1.data:
        raise HTTPException(status_code=400, detail="No Wave 1 deliverables found")

    unapproved = [d for d in wave1.data if d["status"] != "approved"]
    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"{len(unapproved)} Wave 1 deliverable(s) not yet approved",
        )

    # Convert non-workbook deliverables to PDF before release
    for d in wave1.data:
        if d["type"] != "workbook" and d.get("storage_path"):
            try:
                await convert_and_upload_pdf(
                    sb, d["storage_path"], engagement_id, d["id"], d["type"],
                )
            except ConversionError as e:
                log_activity(engagement_id, "system", "pdf_conversion_failed", {
                    "type": d["type"], "error": str(e),
                })
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF conversion failed for {d['type']}. Please check the source file and try again.",
                )

    # Release all Wave 1 deliverables
    now_iso = datetime.now(timezone.utc).isoformat()
    for d in wave1.data:
        sb.table("deliverables").update({
            "status": "released",
            "released_at": now_iso,
        }).eq("id", d["id"]).execute()

    # Generate deliverable_token if engagement doesn't have one
    if not engagement.get("deliverable_token"):
        sb.table("engagements").update({
            "deliverable_token": str(uuid.uuid4()),
        }).eq("id", engagement_id).execute()

    update_engagement_status(engagement_id, "wave_1_released")

    # Re-fetch engagement after token update so email has the token
    engagement = get_engagement_by_id(engagement_id)

    log_activity(engagement_id, "partner", "wave1_released", {})
    email_svc.send_wave1_released(engagement)
    # Notify partner that deliverables have been released
    partner_result = email_svc.send_deliverables_ready_notification(engagement, wave=1)
    log_activity(engagement_id, "system", "email_sent", {
        "type": "deliverables_ready_partner",
        "wave": 1,
        "result": partner_result,
    })

    return {"success": True, "message": "Wave 1 deliverables released to client."}


@router.post("/engagements/{engagement_id}/debrief-complete")
async def debrief_complete(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Mark the executive debrief as complete. Requires partner auth."""
    sb = get_supabase()

    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb.table("engagements").update({
        "debrief_complete": True,
    }).eq("id", engagement_id).execute()

    update_engagement_status(engagement_id, "debrief")

    log_activity(engagement_id, "partner", "debrief_complete", {})

    return {"success": True, "message": "Debrief marked as complete."}


@router.post("/engagements/{engagement_id}/release-deck")
async def release_deck(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Release Wave 2 (deck + retainer proposal) post-debrief. Requires partner auth."""
    sb = get_supabase()
    email_svc = get_email_service()

    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if not engagement.get("debrief_complete"):
        raise HTTPException(
            status_code=400,
            detail="Debrief must be marked complete before releasing Wave 2",
        )

    # Check all Wave 2 deliverables are approved
    wave2 = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("wave", 2)
        .execute()
    )

    if not wave2.data:
        raise HTTPException(status_code=400, detail="No Wave 2 deliverables found")

    unapproved = [d for d in wave2.data if d["status"] != "approved"]
    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"{len(unapproved)} Wave 2 deliverable(s) not yet approved",
        )

    # Convert Wave 2 deliverables to PDF before release
    for d in wave2.data:
        if d.get("storage_path"):
            try:
                await convert_and_upload_pdf(
                    sb, d["storage_path"], engagement_id, d["id"], d["type"],
                )
            except ConversionError as e:
                log_activity(engagement_id, "system", "pdf_conversion_failed", {
                    "type": d["type"], "error": str(e),
                })
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF conversion failed for {d['type']}. Please check the source file and try again.",
                )

    # Release all Wave 2 deliverables
    now_iso = datetime.now(timezone.utc).isoformat()
    for d in wave2.data:
        sb.table("deliverables").update({
            "status": "released",
            "released_at": now_iso,
        }).eq("id", d["id"]).execute()

    update_engagement_status(engagement_id, "wave_2_released")

    # Re-fetch engagement after status update before sending email
    engagement = get_engagement_by_id(engagement_id)

    log_activity(engagement_id, "partner", "wave2_released", {})
    email_svc.send_wave2_released(engagement)
    # Notify partner that deliverables have been released
    partner_result = email_svc.send_deliverables_ready_notification(engagement, wave=2)
    log_activity(engagement_id, "system", "email_sent", {
        "type": "deliverables_ready_partner",
        "wave": 2,
        "result": partner_result,
    })

    return {"success": True, "message": "Wave 2 deliverables released to client."}
