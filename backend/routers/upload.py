from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel

from middleware.auth import verify_upload_token
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity, update_engagement_status
from services.email_service import get_email_service
from config.upload_checklist import (
    UPLOAD_CHECKLIST,
    CHECKLIST_BY_KEY,
    REQUIRED_ITEMS,
    TOTAL_REQUIRED,
    CATEGORY_ORDER,
    CATEGORY_LABELS,
)

logger = logging.getLogger("baxterlabs.upload")

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_EXTENSIONS = {".pdf", ".xlsx", ".xls", ".csv", ".docx", ".doc", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# Statuses that allow uploads
UPLOAD_ALLOWED_STATUSES = {
    "agreement_signed", "documents_pending", "documents_received",
}


def _parse_created_at(created_at_str: str) -> datetime:
    """Parse engagement created_at to a timezone-aware datetime."""
    if isinstance(created_at_str, datetime):
        dt = created_at_str
    else:
        # Handle ISO format from Supabase (with or without timezone)
        dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _is_token_expired(engagement: dict) -> bool:
    """Check if upload token is older than 30 days."""
    created_at = engagement.get("created_at")
    if not created_at:
        return False
    dt = _parse_created_at(created_at)
    return datetime.now(timezone.utc) - dt > timedelta(days=30)


def _build_checklist_response(engagement_id: str, docs_data: list) -> dict:
    """Build the full checklist array with per-item upload status."""
    uploaded_map = {}
    for doc in docs_data:
        if doc.get("item_name"):
            uploaded_map[doc["item_name"]] = doc

    checklist = []
    for item in UPLOAD_CHECKLIST:
        entry = {
            "key": item["key"],
            "category": item["category"],
            "name": item["name"],
            "notes": item["notes"],
            "priority": item["priority"],
            "uploaded": False,
        }
        doc = uploaded_map.get(item["key"])
        if doc:
            entry["uploaded"] = True
            entry["filename"] = doc.get("filename", "")
            entry["file_size"] = doc.get("file_size")
            entry["uploaded_at"] = doc.get("uploaded_at")
        checklist.append(entry)

    required_uploaded = sum(
        1 for item in REQUIRED_ITEMS if item["key"] in uploaded_map
    )

    return {
        "checklist": checklist,
        "progress": {
            "total_items": len(UPLOAD_CHECKLIST),
            "total_uploaded": len(uploaded_map),
            "required_total": TOTAL_REQUIRED,
            "required_uploaded": required_uploaded,
        },
    }


@router.get("/upload/{token}/status")
async def upload_status(token: str):
    """Get upload progress for an engagement via token-based access."""
    engagement = await verify_upload_token(token)
    engagement_id = engagement["id"]

    # Check token expiry
    if _is_token_expired(engagement):
        return {"expired": True, "contact_email": "george@baxterlabs.ai"}

    # Check if already complete
    completed_statuses = {
        "documents_received", "phase_1", "phase_2", "phase_3", "phase_4",
        "phase_5", "phase_6", "debrief", "wave_1_released", "wave_2_released", "closed",
    }
    is_complete = engagement.get("status") in completed_statuses

    sb = get_supabase()
    docs = (
        sb.table("documents")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("document_type", "client_upload")
        .execute()
    )

    result = _build_checklist_response(engagement_id, docs.data)

    client = engagement.get("clients", {})
    return {
        "engagement_id": engagement_id,
        "company_name": client.get("company_name", ""),
        "partner_lead": engagement.get("partner_lead", "George DeVries"),
        "is_complete": is_complete,
        **result,
    }


@router.post("/upload/{token}")
async def upload_file(
    token: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    item_key: str = Form(...),
):
    """Upload a document to an engagement via token-based access."""
    engagement = await verify_upload_token(token)
    engagement_id = engagement["id"]

    # Check token expiry
    if _is_token_expired(engagement):
        raise HTTPException(status_code=410, detail="Upload link has expired. Contact george@baxterlabs.ai")

    # Check engagement allows uploads
    if engagement.get("status") not in UPLOAD_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Uploads are not accepted for this engagement at this time.")

    # Validate item_key
    item = CHECKLIST_BY_KEY.get(item_key)
    if not item:
        raise HTTPException(status_code=400, detail=f"Invalid item_key: {item_key}")

    # File type validation
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit.")

    sb = get_supabase()
    category = item["category"]
    storage_path = f"{engagement_id}/inbox/{category}/{item_key}_{filename}"

    # Replace logic: check for existing doc with same item_name
    existing = (
        sb.table("documents")
        .select("id, storage_path")
        .eq("engagement_id", engagement_id)
        .eq("item_name", item_key)
        .execute()
    )

    if existing.data:
        old_doc = existing.data[0]
        # Delete old storage file (ignore errors if file already gone)
        try:
            sb.storage.from_("engagements").remove([old_doc["storage_path"]])
        except Exception as e:
            logger.warning(f"Failed to delete old storage file: {e}")
        # Delete old DB record
        sb.table("documents").delete().eq("id", old_doc["id"]).execute()

    # Upload to Supabase Storage
    sb.storage.from_("engagements").upload(storage_path, content, {
        "content-type": file.content_type or "application/octet-stream",
    })

    # Create document record
    sb.table("documents").insert({
        "engagement_id": engagement_id,
        "category": category,
        "filename": filename,
        "storage_path": storage_path,
        "file_size": len(content),
        "document_type": "client_upload",
        "item_name": item_key,
        "uploaded_by": "client",
    }).execute()

    log_activity(engagement_id, "client", "document_uploaded", {
        "filename": filename,
        "item_key": item_key,
        "item_name": item["name"],
        "category": category,
        "size": len(content),
    })

    # Email partner per file (non-blocking)
    def _notify():
        try:
            eng = get_engagement_by_id(engagement_id)
            if eng:
                email_svc = get_email_service()
                email_svc.send_document_uploaded_notification(eng, filename, item["name"], category)
        except Exception as e:
            logger.warning(f"Upload notification email failed: {e}")

    background_tasks.add_task(_notify)

    # Return updated progress
    docs = (
        sb.table("documents")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("document_type", "client_upload")
        .execute()
    )
    result = _build_checklist_response(engagement_id, docs.data)

    return {"success": True, "filename": filename, "item_key": item_key, **result["progress"]}


class CompleteBody(BaseModel):
    force: Optional[bool] = False


@router.post("/upload/{token}/complete")
async def mark_upload_complete(token: str, body: Optional[CompleteBody] = None):
    """Mark document submission as complete."""
    engagement = await verify_upload_token(token)
    engagement_id = engagement["id"]

    if body is None:
        body = CompleteBody()

    sb = get_supabase()
    docs = (
        sb.table("documents")
        .select("item_name")
        .eq("engagement_id", engagement_id)
        .eq("document_type", "client_upload")
        .execute()
    )

    uploaded_keys = {doc["item_name"] for doc in docs.data if doc.get("item_name")}
    missing = [item for item in REQUIRED_ITEMS if item["key"] not in uploaded_keys]

    if missing and not body.force:
        return {
            "success": False,
            "warning": True,
            "missing_count": len(missing),
            "missing_items": [{"key": m["key"], "name": m["name"]} for m in missing],
            "message": f"{len(missing)} required item(s) still missing. Set force=true to submit anyway.",
        }

    update_engagement_status(engagement_id, "documents_received")
    log_activity(engagement_id, "client", "upload_complete", {
        "total_uploaded": len(uploaded_keys),
        "missing_required": len(missing),
        "forced": body.force and len(missing) > 0,
    })

    email_svc = get_email_service()
    email_svc.send_upload_complete_notification(engagement)

    return {"success": True, "message": "Document submission marked complete."}
