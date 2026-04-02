"""Router for reading engagement outputs directly from Google Drive folders."""
from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.google_drive_engagement import (
    list_files_in_folder,
    download_file_by_id,
)
from services.phase_output_seed import PHASE_OUTPUTS_SEED

logger = logging.getLogger("baxterlabs.drive_outputs")

router = APIRouter(prefix="/api", tags=["drive_outputs"])

# Build a list of (file_prefix, phase, display_name) sorted longest-prefix-first
# so that a prefix like "Updated_Data_Gap_Resolution" is checked before
# "Data_Gap_Flag_List".
_PREFIX_LOOKUP: List[Tuple[str, int, str]] = []
for _entry in PHASE_OUTPUTS_SEED:
    _prefix = _entry.get("file_prefix")
    if _prefix:
        _PREFIX_LOOKUP.append((_prefix, _entry["phase"], _entry["name"]))
_PREFIX_LOOKUP.sort(key=lambda t: len(t[0]), reverse=True)

# Phase -> Drive folder field on the engagements table
_PHASE_FOLDER_MAP: Dict[int, str] = {
    1: "drive_working_papers_folder_id",
    2: "drive_working_papers_folder_id",
    3: "drive_working_papers_folder_id",
    4: "drive_working_papers_folder_id",
    5: "drive_deliverables_folder_id",
    6: "drive_qc_folder_id",
}


def _match_file(filename: str) -> Optional[Tuple[int, str]]:
    """Match a Drive filename to a phase number and display name.

    Cowork names files as ``{file_prefix}_{ClientName}.{ext}``.
    We strip the extension, then check if the base starts with any known
    ``file_prefix``.  Returns ``(phase, display_name)`` or ``None``.
    """
    base = filename.rsplit(".", 1)[0] if "." in filename else filename
    for prefix, phase, display_name in _PREFIX_LOOKUP:
        if base.startswith(prefix):
            return (phase, display_name)
    return None


@router.get("/engagements/{engagement_id}/drive-outputs")
async def list_drive_outputs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """List .md files from the engagement's Google Drive folders, grouped by phase.

    Reads from:
    - 03_Working_Papers (phases 1-4)
    - 04_Deliverables (phase 5)
    - 05_QC (phase 6)

    Files are matched to phases by comparing filenames to PHASE_OUTPUTS_SEED.
    """
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Collect unique folder IDs to scan (avoid duplicate scans for phases 1-4)
    folders_to_scan: Dict[str, List[int]] = {}  # folder_id -> [phase_numbers]
    for phase_num, field in _PHASE_FOLDER_MAP.items():
        folder_id = eng.get(field)
        if folder_id:
            folders_to_scan.setdefault(folder_id, []).append(phase_num)

    # Fetch approved file IDs from activity_log to determine status
    sb = get_supabase()
    approved_result = (
        sb.table("activity_log")
        .select("details")
        .eq("engagement_id", engagement_id)
        .eq("action", "drive_output_approved")
        .execute()
    )
    approved_file_ids = set()
    for row in approved_result.data or []:
        details = row.get("details") or {}
        fid = details.get("file_id")
        if fid:
            approved_file_ids.add(fid)

    outputs: List[dict] = []
    for folder_id, phase_nums in folders_to_scan.items():
        files = await list_files_in_folder(folder_id, extension=".md")
        for f in files:
            match = _match_file(f["name"])
            if match is None:
                continue
            matched_phase, display_name = match
            # Only include if this phase is one of the phases served by this folder
            if matched_phase not in phase_nums:
                continue
            outputs.append({
                "phase_number": matched_phase,
                "output_name": display_name,
                "file_id": f["id"],
                "filename": f["name"],
                "modified_time": f.get("modifiedTime"),
                "size": f.get("size"),
                "status": "approved" if f["id"] in approved_file_ids else "draft",
            })

    # Sort by phase then filename
    outputs.sort(key=lambda o: (o["phase_number"], o["filename"]))

    return {"outputs": outputs, "count": len(outputs)}


@router.get("/engagements/{engagement_id}/drive-outputs/{file_id}/content")
async def get_drive_output_content(
    engagement_id: str,
    file_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Download a .md file from Google Drive and return its content."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    file_bytes = await download_file_by_id(file_id)
    if not file_bytes:
        raise HTTPException(status_code=502, detail="Failed to download file from Google Drive")

    try:
        content = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 text")

    return {"content": content, "file_id": file_id}


@router.put("/engagements/{engagement_id}/drive-outputs/{file_id}/approve")
async def approve_drive_output(
    engagement_id: str,
    file_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Approve a Drive output file for the current phase gate."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    log_activity(engagement_id, "partner", "drive_output_approved", {
        "file_id": file_id,
    })

    return {"success": True, "file_id": file_id, "status": "approved"}
