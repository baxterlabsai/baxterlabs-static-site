from __future__ import annotations

import os
from typing import Optional
from supabase import create_client, Client

_client: Optional[Client] = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL_BAXTERLABS_STATIC_SITE")
        key = os.getenv("SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE")
        if not url or not key:
            raise RuntimeError("Missing SUPABASE_URL_BAXTERLABS_STATIC_SITE or SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE")
        _client = create_client(url, key)
    return _client


def get_engagement_by_id(engagement_id: str) -> Optional[dict]:
    sb = get_supabase()
    result = sb.table("engagements").select("*, clients(*)").eq("id", engagement_id).execute()
    return result.data[0] if result.data else None


def get_engagement_by_upload_token(token: str) -> Optional[dict]:
    sb = get_supabase()
    result = sb.table("engagements").select("*, clients(*)").eq("upload_token", token).execute()
    return result.data[0] if result.data else None


def get_engagement_by_deliverable_token(token: str) -> Optional[dict]:
    sb = get_supabase()
    result = sb.table("engagements").select("*, clients(*)").eq("deliverable_token", token).execute()
    return result.data[0] if result.data else None


def get_engagement_by_onboarding_token(token: str) -> Optional[dict]:
    sb = get_supabase()
    result = sb.table("engagements").select("*, clients(*)").eq("onboarding_token", token).execute()
    return result.data[0] if result.data else None


def update_engagement_status(engagement_id: str, new_status: str) -> dict:
    sb = get_supabase()
    result = sb.table("engagements").update({"status": new_status}).eq("id", engagement_id).execute()
    return result.data[0] if result.data else {}


def log_activity(engagement_id: Optional[str], actor: str, action: str, details: Optional[dict] = None) -> None:
    sb = get_supabase()
    row = {
        "actor": actor,
        "action": action,
        "details": details or {},
    }
    if engagement_id:
        row["engagement_id"] = engagement_id
    sb.table("activity_log").insert(row).execute()


ENGAGEMENT_FOLDERS = [
    "inbox/financial",
    "inbox/payroll",
    "inbox/vendor",
    "inbox/revenue",
    "inbox/operations",
    "inbox/legal",
    "research",
    "working_papers",
    "deliverables",
    "qc",
    "legal",
]


def create_engagement_folders(engagement_id: str) -> None:
    """Create the standard folder structure for an engagement in Supabase Storage."""
    sb = get_supabase()
    for folder in ENGAGEMENT_FOLDERS:
        path = f"{engagement_id}/{folder}/.keep"
        sb.storage.from_("engagements").upload(
            path,
            b"",
            {"content-type": "application/octet-stream"},
        )
