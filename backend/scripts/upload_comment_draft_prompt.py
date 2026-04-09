"""One-time script: upload comment-draft-prompt.md to Standards/ on the
BaxterLabs-Cowork shared drive.

Usage:
    cd backend
    source .venv/bin/activate
    python -m scripts.upload_comment_draft_prompt
"""

from __future__ import annotations

import io
import os
import sys
import logging

from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Projects/master.env"))

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from googleapiclient.http import MediaIoBaseUpload
from services.google_drive_service import _get_drive_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("upload_comment_draft_prompt")

SHARED_DRIVE_NAME = "BaxterLabs - Cowork"
FOLDER_MIME = "application/vnd.google-apps.folder"

PROMPT_TEMPLATE = r"""# Comment Draft Prompt Template

**Version:** 1.0
**Last updated:** 2026-04-09
**Used by:** backend/services/comment_drafter.py (live path), baxterlabs-content/draft-comment skill (batch path)

---

## Role

You are drafting a LinkedIn comment for George DeVries, Managing Partner of BaxterLabs Advisory. BaxterLabs delivers fixed-scope 14-day profit leak diagnostics to professional service firms ($5M to $50M revenue). George comments on LinkedIn posts to build relationships with potential clients and referral sources, not to sell directly.

## Brand voice

Read `Standards/brand-voice-guidelines.md` from this same Drive folder. Apply the LinkedIn comments row of the Tone-by-Context Matrix. Apply the Banned Constructions section. Apply the Terminology Guide (Avoid and Never-Use tables especially).

If the brand voice spec cannot be read, abort and report the read failure. Do not fall back to inlined rules.

## Input

You will receive a single LinkedIn commenting opportunity with the following fields:
- profile_name: the post author
- post_summary: what the post is about
- relevance_reason: why this post is on the daily list (already-analyzed relevance to BaxterLabs's ICP and George's positioning)
- suggested_angle: the strategic angle for the comment, written by an earlier analysis pass

## Task

Draft a LinkedIn comment from George responding to this post. The comment must:

1. Be 2 to 4 sentences, roughly 50 to 80 words
2. Lead with a specific observation drawn from the post itself, not a generic compliment or restatement
3. End with either a concrete data point from George's diagnostic experience OR a question that invites the author to share more about their actual experience (not a leading question, not a sales question)
4. Apply the suggested_angle as the strategic frame, but do not just restate the suggested_angle verbatim — it is guidance, not script
5. Sound like a peer in the conversation, not a vendor pitching a service
6. Never include hashtags
7. Never @-tag the post author
8. Never mention BaxterLabs by name, never mention the 14-day diagnostic, never mention pricing
9. Never use em dashes (banned construction)
10. Never use any term in the brand voice Avoid or Never-Use tables

## Output

Return only the comment text. No preamble, no explanation, no quotation marks around the comment, no markdown formatting. Just the raw comment text that would be pasted into LinkedIn.
"""


def find_shared_drive(service) -> str:
    result = service.drives().list(pageSize=50, fields="drives(id, name)").execute()
    for d in result.get("drives", []):
        if d["name"] == SHARED_DRIVE_NAME:
            return d["id"]
    raise SystemExit(f"FATAL: Shared drive '{SHARED_DRIVE_NAME}' not found")


def find_folder_by_name(service, name: str, parent_id: str, drive_id: str):
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


def main():
    service = _get_drive_service()
    drive_id = find_shared_drive(service)
    logger.info(f"Shared drive '{SHARED_DRIVE_NAME}' — driveId={drive_id}")

    # Find Standards folder
    standards_id = find_folder_by_name(service, "Standards", drive_id, drive_id)
    if not standards_id:
        raise SystemExit("FATAL: 'Standards' folder not found in shared drive")
    logger.info(f"Standards folder ID={standards_id}")

    filename = "comment-draft-prompt.md"
    content_bytes = PROMPT_TEMPLATE.encode("utf-8")

    # Check if file already exists — delete and re-upload to update
    escaped = filename.replace("'", "\\'")
    existing = service.files().list(
        q=f"'{standards_id}' in parents and name = '{escaped}' and trashed = false",
        fields="files(id, name)",
        includeItemsFromAllDrives=True,
        supportsAllDrives=True,
    ).execute().get("files", [])

    if existing:
        old_id = existing[0]["id"]
        service.files().delete(fileId=old_id, supportsAllDrives=True).execute()
        logger.info(f"Deleted existing '{filename}' (ID={old_id})")

    # Upload
    media = MediaIoBaseUpload(
        io.BytesIO(content_bytes),
        mimetype="text/markdown",
        resumable=False,
    )
    uploaded = service.files().create(
        body={"name": filename, "parents": [standards_id]},
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    file_id = uploaded["id"]
    logger.info(f"Uploaded '{filename}' to Standards/ — ID={file_id} ({len(content_bytes)} bytes)")

    # Verify by reading back
    readback = service.files().get_media(
        fileId=file_id,
        supportsAllDrives=True,
    ).execute()
    readback_len = len(readback) if isinstance(readback, bytes) else len(str(readback).encode("utf-8"))
    logger.info(f"Read-back verification: {readback_len} bytes (expected {len(content_bytes)})")

    if readback_len == len(content_bytes):
        logger.info("SUCCESS — byte count matches")
    else:
        logger.warning(f"MISMATCH — uploaded {len(content_bytes)} bytes, read back {readback_len} bytes")


if __name__ == "__main__":
    main()
