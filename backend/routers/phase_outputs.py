from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from middleware.auth import verify_partner_auth
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    log_activity,
)
from services.phase_output_seed import seed_phase_outputs

logger = logging.getLogger("baxterlabs.phase_outputs")

router = APIRouter(prefix="/api", tags=["phase_outputs"])

ALLOWED_EXTENSIONS = {".docx", ".xlsx", ".pptx", ".pdf", ".md"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/engagements/{engagement_id}/seed-outputs")
async def seed_outputs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Seed all 23 phase output records for an engagement. Idempotent."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()
    count = seed_phase_outputs(sb, engagement_id)

    if count > 0:
        log_activity(engagement_id, "system", "phase_outputs_seeded", {"count": count})

    return {"success": True, "created": count}


@router.get("/engagements/{engagement_id}/phase-outputs")
async def get_phase_outputs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Get all phase output records for an engagement, ordered by phase then output_number."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()
    result = (
        sb.table("phase_outputs")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("phase")
        .order("output_number")
        .execute()
    )

    # Generate download URLs for uploaded files
    for output in result.data:
        if output.get("storage_path"):
            try:
                signed = sb.storage.from_("engagements").create_signed_url(
                    output["storage_path"], 3600
                )
                output["download_url"] = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                output["download_url"] = None
        else:
            output["download_url"] = None

    return {"phase_outputs": result.data, "count": len(result.data)}


@router.get("/engagements/{engagement_id}/phase-outputs/{phase}")
async def get_phase_outputs_by_phase(
    engagement_id: str,
    phase: int,
    user: dict = Depends(verify_partner_auth),
):
    """Get outputs for a specific phase only."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()
    result = (
        sb.table("phase_outputs")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("phase", phase)
        .order("output_number")
        .execute()
    )

    for output in result.data:
        if output.get("storage_path"):
            try:
                signed = sb.storage.from_("engagements").create_signed_url(
                    output["storage_path"], 3600
                )
                output["download_url"] = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                output["download_url"] = None
        else:
            output["download_url"] = None

    return {"phase_outputs": result.data, "count": len(result.data)}


@router.post("/phase-outputs/{output_id}/upload")
async def upload_phase_output(
    output_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_partner_auth),
):
    """Upload a file for a specific phase output."""
    sb = get_supabase()

    # Fetch the phase output
    existing = sb.table("phase_outputs").select("*").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Phase output not found")

    output = existing.data[0]
    engagement_id = output["engagement_id"]

    # Validate file extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    # Build storage path
    dest = output["destination_folder"]
    safe_name = output["name"].replace(" ", "_").replace("/", "_")
    storage_path = f"{engagement_id}/{dest}/{safe_name}{ext}"

    # Delete old file if replacing
    old_path = output.get("storage_path")
    if old_path:
        try:
            sb.storage.from_("engagements").remove([old_path])
        except Exception as e:
            logger.warning(f"Failed to delete old file {old_path}: {e}")

    # Upload to Supabase Storage
    try:
        content_type = file.content_type or "application/octet-stream"
        sb.storage.from_("engagements").upload(
            storage_path, content, {"content-type": content_type}
        )
    except Exception as e:
        logger.error(f"Storage upload failed for {storage_path}: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {e}")

    # If replacing an accepted file, reset status to uploaded
    new_status = "uploaded"

    # Update the phase output record
    updated = (
        sb.table("phase_outputs")
        .update({
            "storage_path": storage_path,
            "file_size": len(content),
            "status": new_status,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "accepted_at": None,
            "accepted_by": None,
        })
        .eq("id", output_id)
        .execute()
    )

    log_activity(engagement_id, "partner", "phase_output_uploaded", {
        "output_id": output_id,
        "phase": output["phase"],
        "name": output["name"],
        "filename": filename,
    })

    return {"success": True, "phase_output": updated.data[0] if updated.data else output}


@router.put("/phase-outputs/{output_id}/accept")
async def accept_phase_output(
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Accept a phase output. Only callable when status is 'uploaded'."""
    sb = get_supabase()

    existing = sb.table("phase_outputs").select("*").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Phase output not found")

    output = existing.data[0]

    if output["status"] != "uploaded":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot accept output with status '{output['status']}'. Must be 'uploaded'.",
        )

    partner_email = user.get("email", "partner")
    now_iso = datetime.now(timezone.utc).isoformat()

    updated = (
        sb.table("phase_outputs")
        .update({
            "status": "accepted",
            "accepted_at": now_iso,
            "accepted_by": partner_email,
        })
        .eq("id", output_id)
        .execute()
    )

    engagement_id = output["engagement_id"]
    log_activity(engagement_id, "partner", "phase_output_accepted", {
        "output_id": output_id,
        "phase": output["phase"],
        "name": output["name"],
    })

    # If this is a Phase 5 client deliverable, sync with the deliverables table
    if output.get("is_client_deliverable") and output["phase"] == 5:
        _sync_deliverable_approval(sb, engagement_id, output)

    return {"success": True, "phase_output": updated.data[0] if updated.data else output}


def _sync_deliverable_approval(sb, engagement_id: str, output: dict) -> None:
    """When a Phase 5 client deliverable is accepted, update the corresponding deliverables row."""
    # Map phase output names to deliverable types
    name_to_type = {
        "Executive Summary": "exec_summary",
        "Full Diagnostic Report": "full_report",
        "Presentation Deck": "deck",
        "90-Day Implementation Roadmap": "roadmap",
        "Phase 2 Retainer Proposal": "retainer_proposal",
    }
    deliv_type = name_to_type.get(output["name"])
    if not deliv_type:
        return

    try:
        result = (
            sb.table("deliverables")
            .select("id, status")
            .eq("engagement_id", engagement_id)
            .eq("type", deliv_type)
            .execute()
        )
        if result.data:
            deliverable = result.data[0]
            if deliverable["status"] != "released":
                sb.table("deliverables").update({
                    "status": "approved",
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", deliverable["id"]).execute()
    except Exception as e:
        logger.warning(f"Failed to sync deliverable approval: {e}")


@router.put("/engagements/{engagement_id}/phase-outputs/{phase}/accept-all")
async def accept_all_phase_outputs(
    engagement_id: str,
    phase: int,
    user: dict = Depends(verify_partner_auth),
):
    """Batch accept all uploaded outputs for a given phase."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()
    result = (
        sb.table("phase_outputs")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("phase", phase)
        .eq("status", "uploaded")
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=400, detail="No uploaded outputs to accept for this phase")

    partner_email = user.get("email", "partner")
    now_iso = datetime.now(timezone.utc).isoformat()

    accepted = []
    for output in result.data:
        updated = (
            sb.table("phase_outputs")
            .update({
                "status": "accepted",
                "accepted_at": now_iso,
                "accepted_by": partner_email,
            })
            .eq("id", output["id"])
            .execute()
        )
        accepted.append(output["name"])

        # Sync Phase 5 client deliverables
        if output.get("is_client_deliverable") and output["phase"] == 5:
            _sync_deliverable_approval(sb, engagement_id, output)

    log_activity(engagement_id, "partner", "phase_outputs_batch_accepted", {
        "phase": phase,
        "accepted": accepted,
    })

    return {"success": True, "accepted_count": len(accepted), "accepted": accepted}
