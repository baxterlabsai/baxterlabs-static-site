# RELEASE NOTES VIEWER ENDPOINT
#
# This endpoint serves the release notes markdown file from Supabase Storage
# at operations-manual/release-notes.md. It is read-only. The frontend at
# /dashboard/help/releases fetches from this endpoint and renders the
# markdown with react-markdown.
#
# To update the release notes:
#   1. Upload the new markdown file to operations-manual/release-notes.md
#      (overwriting the existing file)
#   2. The dashboard will pick up the new content on next page load
#      (cached for 5 minutes via Cache-Control header)

from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.release_notes")

router = APIRouter(prefix="/api", tags=["help"])


class ReleaseNotesResponse(BaseModel):
    content: str
    version: str
    updated_at: Optional[str] = None
    size_bytes: int


@router.get("/help/release-notes")
async def get_release_notes():
    """Serve the release notes markdown from Supabase Storage."""
    sb = get_supabase()

    try:
        file_bytes = sb.storage.from_("manuals").download("operations-manual/release-notes.md")
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail="Release notes not found in storage. The file may not be uploaded yet.",
            )
        logger.error("Failed to download release notes: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Could not reach Supabase Storage to retrieve the release notes.",
        )

    content = file_bytes.decode("utf-8")
    size_bytes = len(file_bytes)

    # Parse the most recent version from the first ## Version heading
    version = "unknown"
    match = re.search(r"^## Version (\d+\.\d+(?:\.\d+)?)", content, re.MULTILINE)
    if match:
        version = f"v{match.group(1)}"
    else:
        logger.warning("Could not parse version from release notes content")

    # Get updated_at from storage metadata
    updated_at = None
    try:
        listing = sb.storage.from_("manuals").list("operations-manual")
        for item in listing:
            if item.get("name") == "release-notes.md":
                updated_at = item.get("updated_at")
                break
    except Exception:
        pass

    response = JSONResponse(
        content={
            "content": content,
            "version": version,
            "updated_at": updated_at,
            "size_bytes": size_bytes,
        }
    )
    response.headers["Cache-Control"] = "public, max-age=300"
    return response
