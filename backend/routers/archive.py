from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import (
    get_supabase,
    get_engagement_by_id,
    update_engagement_status,
    log_activity,
)
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.archive")

router = APIRouter(prefix="/api", tags=["archive"])

# Ordered list of engagement statuses from earliest to latest.
STATUS_ORDER: List[str] = [
    "intake",
    "nda_pending",
    "nda_signed",
    "discovery_done",
    "agreement_pending",
    "agreement_signed",
    "documents_pending",
    "documents_received",
    "phase_0",
    "phase_1",
    "phase_2",
    "phase_3",
    "phase_4",
    "phase_5",
    "phase_6",
    "phase_7",
    "phases_complete",
    "debrief",
    "wave_1_released",
    "wave_2_released",
    "closed",
]


def _status_index(status: str) -> int:
    """Return the index of a status in the ordered pipeline, or -1 if unknown."""
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _list_all_files(sb, bucket: str, prefix: str) -> List[str]:
    """Recursively list every file path under *prefix* in *bucket*.

    The Supabase ``list()`` method only returns items at a single directory
    level.  Items that represent folders have no ``id`` (or ``id`` is None);
    items that represent files have a truthy ``id``.
    """
    all_files: List[str] = []
    try:
        items = sb.storage.from_(bucket).list(path=prefix)
    except Exception as exc:
        logger.warning("Failed to list %s/%s: %s", bucket, prefix, exc)
        return all_files

    for item in items:
        name = item.get("name", "")
        if not name:
            continue
        child_path = f"{prefix}/{name}" if prefix else name
        if item.get("id") is None:
            # It's a folder — recurse
            all_files.extend(_list_all_files(sb, bucket, child_path))
        else:
            # It's a file
            all_files.append(child_path)

    return all_files


@router.delete("/engagements/{engagement_id}")
async def delete_engagement(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Soft-delete an engagement. Sets is_deleted=True and deleted_at timestamp.
    The engagement will no longer appear in dashboard queries."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if engagement.get("is_deleted"):
        raise HTTPException(status_code=400, detail="Engagement is already deleted")

    sb = get_supabase()
    sb.table("engagements").update({
        "is_deleted": True,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", engagement_id).execute()

    log_activity(engagement_id, "partner", "engagement_deleted", {
        "deleted_by": user.get("email"),
    })

    return {"success": True, "message": "Engagement deleted."}


@router.post("/engagements/{engagement_id}/archive")
async def archive_engagement(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Archive a completed engagement — move files to the archive bucket,
    generate a completion manifest, mark the engagement as closed, and
    notify the partner."""

    # ------------------------------------------------------------------
    # 1. Fetch & validate engagement
    # ------------------------------------------------------------------
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    current_status: str = engagement.get("status", "")

    if current_status == "closed":
        raise HTTPException(status_code=400, detail="Engagement is already archived")

    phases_complete_idx = _status_index("phases_complete")
    current_idx = _status_index(current_status)

    if current_idx < phases_complete_idx:
        raise HTTPException(
            status_code=400,
            detail="Engagement must have status 'phases_complete' or later to archive",
        )

    # ------------------------------------------------------------------
    # 2. Move files from engagements → archive bucket
    # ------------------------------------------------------------------
    sb = get_supabase()
    files_moved_count = 0

    try:
        all_files = _list_all_files(sb, "engagements", engagement_id)
        for file_path in all_files:
            try:
                content = sb.storage.from_("engagements").download(file_path)
                sb.storage.from_("archive").upload(
                    file_path,
                    content,
                    {"content-type": "application/octet-stream"},
                )
                sb.storage.from_("engagements").remove([file_path])
                files_moved_count += 1
            except Exception as exc:
                logger.warning(
                    "Failed to move file %s for engagement %s: %s",
                    file_path,
                    engagement_id,
                    exc,
                )
    except Exception as exc:
        logger.error(
            "Fatal error during file migration for engagement %s: %s",
            engagement_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Archive failed during file migration.",
        )

    # ------------------------------------------------------------------
    # 3. Generate completion manifest
    # ------------------------------------------------------------------
    try:
        phase_executions = (
            sb.table("phase_executions")
            .select("phase, created_at, prompt_version")
            .eq("engagement_id", engagement_id)
            .order("phase")
            .execute()
        )
        deliverables_data = (
            sb.table("deliverables")
            .select("type, wave, status, approved_at, released_at")
            .eq("engagement_id", engagement_id)
            .execute()
        )
        documents_data = (
            sb.table("documents")
            .select("category, filename, uploaded_at")
            .eq("engagement_id", engagement_id)
            .execute()
        )
        research_data = (
            sb.table("research_documents")
            .select("type, created_at")
            .eq("engagement_id", engagement_id)
            .execute()
        )
        legal_data = (
            sb.table("legal_documents")
            .select("type, status, signed_at")
            .eq("engagement_id", engagement_id)
            .execute()
        )

        client = engagement.get("clients", {})

        manifest = {
            "engagement_id": engagement_id,
            "client": {
                "company_name": client.get("company_name"),
                "primary_contact_name": client.get("primary_contact_name"),
                "primary_contact_email": client.get("primary_contact_email"),
            },
            "engagement": {
                "start_date": engagement.get("start_date"),
                "target_end_date": engagement.get("target_end_date"),
                "partner_lead": engagement.get("partner_lead"),
                "fee": engagement.get("fee"),
                "final_status": "closed",
            },
            "phases_executed": [
                {
                    "phase": pe["phase"],
                    "executed_at": pe["created_at"],
                    "prompt_version": pe.get("prompt_version"),
                }
                for pe in phase_executions.data
            ],
            "deliverables": [
                {
                    "type": d["type"],
                    "wave": d["wave"],
                    "status": d["status"],
                    "approved_at": d.get("approved_at"),
                    "released_at": d.get("released_at"),
                }
                for d in deliverables_data.data
            ],
            "documents_received": [
                {
                    "category": d["category"],
                    "filename": d["filename"],
                    "uploaded_at": d.get("uploaded_at"),
                }
                for d in documents_data.data
            ],
            "research_generated": [
                {"type": r["type"], "created_at": r["created_at"]}
                for r in research_data.data
            ],
            "legal_documents": [
                {
                    "type": l["type"],
                    "status": l["status"],
                    "signed_at": l.get("signed_at"),
                }
                for l in legal_data.data
            ],
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "archived_by": user.get("email", "unknown"),
        }

        # ------------------------------------------------------------------
        # 4. Store manifest in archive bucket
        # ------------------------------------------------------------------
        manifest_json = json.dumps(manifest, indent=2, default=str)
        sb.storage.from_("archive").upload(
            f"{engagement_id}/completion_manifest.json",
            manifest_json.encode("utf-8"),
            {"content-type": "application/json"},
        )
    except Exception as exc:
        logger.error(
            "Failed to generate/store manifest for engagement %s: %s",
            engagement_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Archive failed during manifest generation.",
        )

    # ------------------------------------------------------------------
    # 5. Update status to closed + set archived_at
    # ------------------------------------------------------------------
    try:
        sb.table("engagements").update({
            "status": "closed",
            "archived_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", engagement_id).execute()
    except Exception as exc:
        logger.error(
            "Failed to update status for engagement %s: %s",
            engagement_id,
            exc,
        )
        raise HTTPException(
            status_code=500,
            detail="Archive failed while updating engagement status.",
        )

    # ------------------------------------------------------------------
    # 6. Email partner
    # ------------------------------------------------------------------
    try:
        email_svc = get_email_service()
        email_svc.send_engagement_archived(engagement)
    except Exception as exc:
        logger.warning(
            "Failed to send archive email for engagement %s: %s",
            engagement_id,
            exc,
        )

    # ------------------------------------------------------------------
    # 7. Log activity
    # ------------------------------------------------------------------
    try:
        log_activity(
            engagement_id,
            "partner",
            "engagement_archived",
            {
                "archived_by": user.get("email"),
                "files_moved": files_moved_count,
            },
        )
    except Exception as exc:
        logger.warning(
            "Failed to log archive activity for engagement %s: %s",
            engagement_id,
            exc,
        )

    # ------------------------------------------------------------------
    # 8. Create post-engagement follow-up sequence
    # ------------------------------------------------------------------
    try:
        from services.follow_up_service import create_follow_up_sequence
        client = engagement.get("clients", {})
        create_follow_up_sequence(engagement, client)
    except Exception as exc:
        logger.warning(
            "Failed to create follow-up sequence for engagement %s: %s",
            engagement_id,
            exc,
        )

    # ------------------------------------------------------------------
    # 9. Return
    # ------------------------------------------------------------------
    return {
        "success": True,
        "message": f"Engagement archived. {files_moved_count} files moved to archive.",
        "manifest_path": f"{engagement_id}/completion_manifest.json",
    }
