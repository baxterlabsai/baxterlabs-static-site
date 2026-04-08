# OPERATIONS MANUAL VIEWER ENDPOINT
#
# This endpoint serves the current Operations Manual markdown file from
# Supabase Storage at operations-manual/current.md. It is read-only.
# The frontend at /dashboard/help/manual fetches from this endpoint and
# renders the markdown with react-markdown.
#
# To update the manual:
#   1. Upload the new markdown file to operations-manual/current.md
#      (overwriting the existing file)
#   2. The dashboard will pick up the new content on next page load
#      (cached for 5 minutes via Cache-Control header)
#
# Do not add write/upload endpoints here. Manual updates go through
# the OpsManual_v2_X_Prompt_Sequence.md process and are uploaded
# manually via the Supabase MCP connector or dashboard.

from __future__ import annotations

import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.operations_manual")

router = APIRouter(prefix="/api", tags=["help"])


class OperationsManualResponse(BaseModel):
    content: str
    version: str
    updated_at: Optional[str] = None
    size_bytes: int


@router.get("/help/operations-manual")
async def get_operations_manual():
    """Serve the current Operations Manual markdown from Supabase Storage."""
    sb = get_supabase()

    try:
        file_bytes = sb.storage.from_("manuals").download("operations-manual/current.md")
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail="Operations Manual not found in storage. The file may not be uploaded yet.",
            )
        logger.error("Failed to download operations manual: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Could not reach Supabase Storage to retrieve the Operations Manual.",
        )

    content = file_bytes.decode("utf-8")
    size_bytes = len(file_bytes)

    # Parse version from the first 100 lines
    version = "unknown"
    first_lines = "\n".join(content.split("\n")[:100])
    match = re.search(r"Version (\d+\.\d+)", first_lines)
    if match:
        version = f"v{match.group(1)}"
    else:
        logger.warning("Could not parse version from operations manual content")

    # Get updated_at from storage metadata
    updated_at = None
    try:
        listing = sb.storage.from_("manuals").list("operations-manual")
        for item in listing:
            if item.get("name") == "current.md":
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
