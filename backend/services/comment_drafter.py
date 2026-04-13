"""
Comment Drafter Service

Generates LinkedIn comment drafts for commenting_opportunities rows.
This is the canonical "live" implementation called by the Commenting page
Redraft endpoint. A parallel Cowork skill (baxterlabs-content/draft-comment)
mirrors this for the scheduled task batch path. Both read the same prompt
template from Drive (Standards/comment-draft-prompt.md) and the same brand
voice spec (Standards/BaxterLabs_Brand_Voice.md) so they stay in sync.

Architecture: this is Architecture 1 from the P6 design — the live path goes
through FastAPI directly to the Anthropic API, the batch path goes through
Cowork. Both produce equivalent drafts because they share their prompt
template via Drive.
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from anthropic import Anthropic

from services.google_drive_service import _get_drive_service
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.comment_drafter")

SHARED_DRIVE_NAME = "BaxterLabs - Cowork"
FOLDER_MIME = "application/vnd.google-apps.folder"
PROMPT_TEMPLATE_FILENAME = "comment-draft-prompt.md"
BRAND_VOICE_FILENAME = "BaxterLabs_Brand_Voice.md"
MODEL = "claude-opus-4-6"  # Opus for public-facing content (LinkedIn comments are read by external audience)
MAX_TOKENS = 400


class CommentDraftError(Exception):
    """Raised when a comment draft cannot be generated."""
    pass


class DriveReadError(CommentDraftError):
    """Raised when a required Drive file cannot be read. Fail-closed."""
    pass


def _find_shared_drive_id(service) -> str:
    """Return the driveId for BaxterLabs - Cowork."""
    result = service.drives().list(pageSize=50, fields="drives(id, name)").execute()
    for d in result.get("drives", []):
        if d["name"] == SHARED_DRIVE_NAME:
            return d["id"]
    raise DriveReadError(f"Shared drive '{SHARED_DRIVE_NAME}' not found")


def _find_folder_by_name(
    service, name: str, parent_id: str, drive_id: str
) -> Optional[str]:
    """Find a folder by name inside parent_id. Returns folder ID or None."""
    q = (
        f"name = '{name}' and "
        f"'{parent_id}' in parents and "
        f"mimeType = '{FOLDER_MIME}' and "
        f"trashed = false"
    )
    result = service.files().list(
        q=q,
        fields="files(id, name)",
        includeItemsFromAllDrives=True,
        supportsAllDrives=True,
        corpora="drive",
        driveId=drive_id,
    ).execute()
    files = result.get("files", [])
    return files[0]["id"] if files else None


def _download_file_from_standards(
    service, drive_id: str, filename: str
) -> str:
    """Download a text file from Standards/ on the shared drive.

    Returns the file content as a UTF-8 string.
    Raises DriveReadError if the folder or file is not found.
    """
    standards_id = _find_folder_by_name(service, "Standards", drive_id, drive_id)
    if not standards_id:
        raise DriveReadError("Standards folder not found on shared drive")

    escaped = filename.replace("'", "\\'")
    result = service.files().list(
        q=f"'{standards_id}' in parents and name = '{escaped}' and trashed = false",
        fields="files(id, name)",
        includeItemsFromAllDrives=True,
        supportsAllDrives=True,
    ).execute()
    files = result.get("files", [])
    if not files:
        raise DriveReadError(f"File '{filename}' not found in Standards/ folder")

    content = service.files().get_media(
        fileId=files[0]["id"],
        supportsAllDrives=True,
    ).execute()

    if isinstance(content, bytes):
        return content.decode("utf-8")
    return str(content)


def draft_comment_for_opportunity(opp_id: str) -> dict:
    """
    Generate a LinkedIn comment draft for a single commenting opportunity.

    Args:
        opp_id: UUID of the commenting_opportunities row

    Returns:
        dict with keys:
            - draft_comment: str (the generated draft)
            - draft_generated_at: str (ISO timestamp)

    Raises:
        CommentDraftError: if the opportunity does not exist
        DriveReadError: if either Drive file cannot be read (fail-closed)
        Exception: if the Anthropic API call fails

    This function:
    1. SELECTs the opportunity row from commenting_opportunities
    2. Reads the prompt template from Drive (fail-closed)
    3. Reads the brand voice spec from Drive (fail-closed)
    4. Builds the message for Anthropic API (system = prompt template + brand
       voice spec, user = opportunity fields)
    5. Calls Anthropic API with model=MODEL, max_tokens=MAX_TOKENS
    6. Extracts the text content from the response
    7. UPDATEs commenting_opportunities SET draft_comment = <result>,
       draft_generated_at = now() WHERE id = opp_id
    8. Returns the draft text and timestamp

    This function does NOT touch any column other than draft_comment and
    draft_generated_at. It does NOT change status. It does NOT touch acted_at.
    """
    # 1. Fetch the opportunity row
    sb = get_supabase()
    result = (
        sb.table("commenting_opportunities")
        .select("*")
        .eq("id", opp_id)
        .execute()
    )
    if not result.data:
        raise CommentDraftError(f"Commenting opportunity {opp_id} not found")
    opp = result.data[0]

    # 2-3. Read prompt template and brand voice spec from Drive (fail-closed)
    service = _get_drive_service()

    logger.info("Looking up shared drive '%s'", SHARED_DRIVE_NAME)
    try:
        drive_id = _find_shared_drive_id(service)
    except Exception as e:
        logger.exception("Failed to find shared drive '%s'", SHARED_DRIVE_NAME)
        raise DriveReadError(f"Shared drive lookup failed: {e}") from e

    logger.info("Looking up 'Standards' folder on shared drive %s", drive_id)
    try:
        prompt_template = _download_file_from_standards(
            service, drive_id, PROMPT_TEMPLATE_FILENAME
        )
    except DriveReadError:
        raise
    except Exception as e:
        logger.exception("Failed to download '%s'", PROMPT_TEMPLATE_FILENAME)
        raise DriveReadError(f"Drive read failed for {PROMPT_TEMPLATE_FILENAME}: {e}") from e
    logger.info("Downloaded '%s' (%d bytes)", PROMPT_TEMPLATE_FILENAME, len(prompt_template))

    logger.info("Downloading 'Standards/%s'", BRAND_VOICE_FILENAME)
    try:
        brand_voice = _download_file_from_standards(
            service, drive_id, BRAND_VOICE_FILENAME
        )
    except DriveReadError:
        raise
    except Exception as e:
        logger.exception("Failed to download '%s'", BRAND_VOICE_FILENAME)
        raise DriveReadError(f"Drive read failed for {BRAND_VOICE_FILENAME}: {e}") from e
    logger.info("Downloaded '%s' (%d bytes)", BRAND_VOICE_FILENAME, len(brand_voice))

    # 4. Build messages
    system_prompt = (
        prompt_template
        + "\n\n---\n\n## Brand Voice Specification\n\n"
        + brand_voice
    )

    post_body = opp.get("post_body")
    post_summary = opp.get("post_summary", "")
    if post_body:
        post_text_label = "Post body"
        post_text_value = post_body
    else:
        post_text_label = "Post summary (full text not available)"
        post_text_value = post_summary

    user_message = (
        f"profile_name: {opp.get('profile_name', '')}\n"
        f"{post_text_label}: {post_text_value}\n"
        f"relevance_reason: {opp.get('relevance_reason', '')}\n"
        f"suggested_angle: {opp.get('suggested_angle', '')}"
    )

    # 5. Call Anthropic API
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    # 6. Extract text
    draft_text = response.content[0].text

    # 7. Update the row
    now = datetime.now(timezone.utc).isoformat()
    sb.table("commenting_opportunities").update({
        "draft_comment": draft_text,
        "draft_generated_at": now,
    }).eq("id", opp_id).execute()

    # 8. Return
    return {
        "draft_comment": draft_text,
        "draft_generated_at": now,
    }
