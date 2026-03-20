"""One-time script: populate Template_Library/ and Standards/Logos/ on the
BaxterLabs-Cowork shared drive from the Supabase templates bucket.

Usage:
    cd backend
    source .venv/bin/activate
    python -m scripts.setup_drive_template_library
"""

from __future__ import annotations

import os
import sys
import time
import logging
from typing import Dict, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Projects/master.env"))

# --- path setup so `services.*` imports resolve ---
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client
from services.google_drive_service import _get_drive_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("setup_drive_template_library")

SHARED_DRIVE_NAME = "BaxterLabs - Cowork"
FOLDER_MIME = "application/vnd.google-apps.folder"

# ---------------------------------------------------------------------------
# Supabase path  ->  (Drive parent folder, Drive subfolder or None)
#
# Parent is looked up under the shared-drive root.
# Subfolder (when present) is looked up inside the parent.
# ---------------------------------------------------------------------------
UPLOAD_MAP: List[Tuple[str, str, Optional[str]]] = [
    # 00_Sales_and_Marketing
    ("00_Sales_and_Marketing/01_Offer_Definition.docx",          "Template_Library", "00_Sales_and_Marketing"),
    ("00_Sales_and_Marketing/02_Sales_Call_Framework.docx",      "Template_Library", "00_Sales_and_Marketing"),
    ("00_Sales_and_Marketing/03_Interview_Guide.docx",           "Template_Library", "00_Sales_and_Marketing"),
    ("00_Sales_and_Marketing/05_LinkedIn_Profile_Copy.docx",     "Template_Library", "00_Sales_and_Marketing"),
    ("00_Sales_and_Marketing/06_Outreach_Scripts.docx",          "Template_Library", "00_Sales_and_Marketing"),
    # 01_Engagement_Setup
    ("01_Engagement_Setup/12_Data_Request_Checklist.docx",       "Template_Library", "01_Engagement_Setup"),
    ("01_Engagement_Setup/13_Client_Folder_Template.docx",       "Template_Library", "01_Engagement_Setup"),
    ("01_Engagement_Setup/14_Engagement_Agreement.docx",         "Template_Library", "01_Engagement_Setup"),
    ("01_Engagement_Setup/18_Operating_Agreement.docx",          "Template_Library", "01_Engagement_Setup"),
    ("01_Engagement_Setup/21_Mutual_NDA.docx",                   "Template_Library", "01_Engagement_Setup"),
    # 02_Analysis_Tools
    ("02_Analysis_Tools/07_Pipeline_Tracker.xlsx",               "Template_Library", "02_Analysis_Tools"),
    ("02_Analysis_Tools/08_Financial_Models.xlsx",               "Template_Library", "02_Analysis_Tools"),
    ("02_Analysis_Tools/21_Preliminary_Findings_Memo.docx",      "Template_Library", "02_Analysis_Tools"),
    ("02_Analysis_Tools/22_Workflow_Inefficiency_Matrix.xlsx",   "Template_Library", "02_Analysis_Tools"),
    ("02_Analysis_Tools/27_Quality_Control_Checklist.docx",      "Template_Library", "02_Analysis_Tools"),
    # 03_Client_Deliverables
    ("03_Client_Deliverables/09_Report_Template.docx",           "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/10_Executive_Summary.docx",         "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/11_Presentation_Deck.pptx",         "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/23_Profit_Leak_Quantification_Workbook.xlsx", "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/24_Operational_Bottleneck_Analysis.docx",     "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/25_Automation_Recommendations.docx",          "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/26_90_Day_Implementation_Roadmap.docx",       "Template_Library", "03_Client_Deliverables"),
    ("03_Client_Deliverables/28_Day_7_Progress_Update.docx",     "Template_Library", "03_Client_Deliverables"),
    # 04_Post_Engagement
    ("04_Post_Engagement/15_Post_Engagement_Survey.docx",        "Template_Library", "04_Post_Engagement"),
    ("04_Post_Engagement/16_Case_Study_Template.docx",           "Template_Library", "04_Post_Engagement"),
    ("04_Post_Engagement/17_Phase2_Retainer_Proposal.docx",      "Template_Library", "04_Post_Engagement"),
    # 05_Business_Operations
    ("05_Business_Operations/20_Quarterly_Review.docx",          "Template_Library", "05_Business_Operations"),
    # Standards / Logos
    ("Standards/logos/baxterlabs-logo.png",                      "Standards", "Logos"),
    ("Standards/logos/baxterlabs-logo-white-text.png",           "Standards", "Logos"),
]

# MIME type lookup
MIME_TYPES: Dict[str, str] = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".png": "image/png",
}


def _mime_for(filename: str) -> str:
    for ext, mime in MIME_TYPES.items():
        if filename.lower().endswith(ext):
            return mime
    return "application/octet-stream"


# ---------------------------------------------------------------------------
# Drive helpers
# ---------------------------------------------------------------------------

def find_shared_drive(service) -> str:
    """Return the driveId for BaxterLabs - Cowork."""
    result = service.drives().list(pageSize=50, fields="drives(id, name)").execute()
    for d in result.get("drives", []):
        if d["name"] == SHARED_DRIVE_NAME:
            return d["id"]
    raise SystemExit(f"FATAL: Shared drive '{SHARED_DRIVE_NAME}' not found")


def find_folder_by_name(service, name: str, parent_id: str, drive_id: str) -> Optional[str]:
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


def file_exists_in_folder(service, filename: str, folder_id: str, drive_id: str) -> bool:
    """Check if a file with this name already exists in the folder."""
    q = (
        f"name = '{filename}' and "
        f"'{folder_id}' in parents and "
        f"trashed = false"
    )
    result = service.files().list(
        q=q,
        fields="files(id)",
        includeItemsFromAllDrives=True,
        supportsAllDrives=True,
        corpora="drive",
        driveId=drive_id,
    ).execute()
    return len(result.get("files", [])) > 0


def upload_file(service, filename: str, file_bytes: bytes, parent_id: str) -> str:
    """Upload a file to Drive. Returns the file ID."""
    import io
    from googleapiclient.http import MediaIoBaseUpload

    metadata = {"name": filename, "parents": [parent_id]}
    media = MediaIoBaseUpload(
        io.BytesIO(file_bytes),
        mimetype=_mime_for(filename),
        resumable=False,
    )
    uploaded = service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return uploaded["id"]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    start = time.time()

    # --- Supabase client ---
    sb_url = os.environ.get("SUPABASE_URL_BAXTERLABS_STATIC_SITE")
    sb_key = os.environ.get("SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE")
    if not sb_url or not sb_key:
        raise SystemExit("FATAL: SUPABASE_URL_BAXTERLABS_STATIC_SITE / SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE not set")
    sb = create_client(sb_url, sb_key)

    # --- Drive service ---
    service = _get_drive_service()
    drive_id = find_shared_drive(service)
    logger.info(f"Shared drive '{SHARED_DRIVE_NAME}' — driveId={drive_id}")

    # --- Resolve top-level folder IDs (Template_Library, Standards) ---
    top_folder_ids: Dict[str, str] = {}
    for top_name in ("Template_Library", "Standards"):
        fid = find_folder_by_name(service, top_name, drive_id, drive_id)
        if fid:
            top_folder_ids[top_name] = fid
            logger.info(f"Found '{top_name}' — ID={fid}")
        else:
            logger.warning(f"Top-level folder '{top_name}' NOT FOUND in shared drive — files targeting it will be skipped")

    # --- Resolve subfolder IDs ---
    subfolder_ids: Dict[str, str] = {}  # key = "Template_Library/00_Sales_and_Marketing"
    subfolder_names = set()
    for _, parent_name, sub_name in UPLOAD_MAP:
        if sub_name:
            subfolder_names.add((parent_name, sub_name))

    for parent_name, sub_name in sorted(subfolder_names):
        parent_id = top_folder_ids.get(parent_name)
        if not parent_id:
            continue
        fid = find_folder_by_name(service, sub_name, parent_id, drive_id)
        key = f"{parent_name}/{sub_name}"
        if fid:
            subfolder_ids[key] = fid
            logger.info(f"Found '{key}' — ID={fid}")
        else:
            logger.warning(f"Subfolder '{key}' NOT FOUND — files targeting it will be skipped")

    # --- Upload files ---
    uploaded: List[str] = []
    skipped: List[Tuple[str, str]] = []

    for supabase_path, parent_name, sub_name in UPLOAD_MAP:
        filename = supabase_path.rsplit("/", 1)[-1]

        # Resolve destination folder
        if sub_name:
            dest_key = f"{parent_name}/{sub_name}"
            dest_id = subfolder_ids.get(dest_key)
        else:
            dest_id = top_folder_ids.get(parent_name)
            dest_key = parent_name

        if not dest_id:
            skipped.append((supabase_path, f"destination folder '{dest_key}' not found"))
            continue

        # Idempotency: skip if file already exists
        try:
            if file_exists_in_folder(service, filename, dest_id, drive_id):
                skipped.append((supabase_path, "already exists in Drive"))
                continue
        except Exception as e:
            skipped.append((supabase_path, f"existence check failed: {e}"))
            continue

        # Download from Supabase
        try:
            file_bytes = sb.storage.from_("templates").download(supabase_path)
            if not file_bytes:
                skipped.append((supabase_path, "Supabase download returned empty"))
                continue
        except Exception as e:
            skipped.append((supabase_path, f"Supabase download failed: {e}"))
            continue

        # Upload to Drive
        try:
            file_id = upload_file(service, filename, file_bytes, dest_id)
            uploaded.append(supabase_path)
            logger.info(f"Uploaded '{filename}' -> '{dest_key}' (ID={file_id})")
        except Exception as e:
            skipped.append((supabase_path, f"Drive upload failed: {e}"))
            continue

    # --- Summary ---
    elapsed = time.time() - start
    print("\n" + "=" * 60)
    print(f"  Files uploaded successfully: {len(uploaded)}")
    if uploaded:
        for f in uploaded:
            print(f"    + {f}")
    print(f"\n  Files skipped/failed: {len(skipped)}")
    if skipped:
        for f, reason in skipped:
            print(f"    - {f}  ({reason})")
    print(f"\n  Total time: {elapsed:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
