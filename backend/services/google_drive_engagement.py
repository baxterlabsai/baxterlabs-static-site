"""Google Drive — create client engagement folder on BaxterLabs-Cowork shared drive."""

from __future__ import annotations

import io
import os
import logging
from datetime import date
from typing import Optional

from googleapiclient.http import MediaIoBaseUpload

from services.google_drive_service import _get_drive_service

logger = logging.getLogger("baxterlabs.google_drive_engagement")

SHARED_DRIVE_NAME = "BaxterLabs - Cowork"
FOLDER_MIME = "application/vnd.google-apps.folder"

SUBFOLDERS = [
    "00_Engagement_Info",
    "01_Inbox",
    "02_Interviews",
    "03_Working_Papers",
    "04_Deliverables",
    "05_QC",
]


async def create_client_engagement_folder(
    engagement_id: str,
    client_name: str,
    engagement_date: date,
    signed_pdf_path: Optional[str],
    envelope_id: Optional[str],
    supabase_client,
) -> Optional[dict]:
    """Create an engagement folder with 6 subfolders on the shared drive.

    Uploads the signed agreement PDF to 00_Engagement_Info/.
    Returns {"folder_id": ..., "folder_url": ...} on success, None on failure.
    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()

        # 1. Find shared drive
        drive_id = _find_shared_drive(service)
        logger.info(f"Found shared drive '{SHARED_DRIVE_NAME}' — driveId={drive_id}")

        # 2. Find Active_Engagements folder
        active_folder_id = _find_active_engagements_folder(service, drive_id)
        logger.info(f"Active_Engagements folder ID={active_folder_id}")

        # 3. Create root client folder
        root_name = f"BaxterLabs — {client_name} — {engagement_date.strftime('%Y-%m')}"
        root_folder_id = _create_folder(service, root_name, active_folder_id)
        logger.info(f"Created root folder '{root_name}' — ID={root_folder_id}")

        # 4. Create 6 subfolders
        engagement_info_folder_id = None
        for folder_name in SUBFOLDERS:
            folder_id = _create_folder(service, folder_name, root_folder_id)
            if folder_name == "00_Engagement_Info":
                engagement_info_folder_id = folder_id

        logger.info(f"Created {len(SUBFOLDERS)} subfolders for engagement {engagement_id}")

        # 5. Upload signed PDF to 00_Engagement_Info/
        if signed_pdf_path and envelope_id and engagement_info_folder_id:
            try:
                pdf_bytes = supabase_client.storage.from_("engagements").download(signed_pdf_path)
                if pdf_bytes:
                    pdf_filename = f"{envelope_id}_signed_agreement.pdf"
                    media = MediaIoBaseUpload(
                        io.BytesIO(pdf_bytes),
                        mimetype="application/pdf",
                        resumable=False,
                    )
                    service.files().create(
                        body={"name": pdf_filename, "parents": [engagement_info_folder_id]},
                        media_body=media,
                        fields="id",
                        supportsAllDrives=True,
                    ).execute()
                    logger.info(f"Uploaded signed PDF to 00_Engagement_Info/ — {pdf_filename}")
                else:
                    logger.warning(f"Signed PDF download returned empty — path={signed_pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to upload signed PDF to Drive: {e}")
        else:
            logger.info("No signed PDF path or envelope_id — skipping signed PDF upload")

        folder_url = f"https://drive.google.com/drive/folders/{root_folder_id}"
        logger.info(f"Drive folder creation complete for engagement {engagement_id} — {folder_url}")

        return {
            "folder_id": root_folder_id,
            "folder_url": folder_url,
        }

    except Exception as e:
        logger.error(f"Google Drive folder creation failed for engagement {engagement_id}: {e}", exc_info=True)
        return None


def _find_shared_drive(service) -> str:
    """Find the 'BaxterLabs - Cowork' shared drive and return its driveId."""
    result = service.drives().list(
        pageSize=50,
        fields="drives(id, name)",
    ).execute()
    for d in result.get("drives", []):
        if d["name"] == SHARED_DRIVE_NAME:
            return d["id"]
    raise ValueError(f"Shared drive '{SHARED_DRIVE_NAME}' not found")


def _find_active_engagements_folder(service, drive_id: str) -> str:
    """Find the Active_Engagements folder inside the shared drive."""
    # Set GOOGLE_DRIVE_ACTIVE_ENGAGEMENTS_FOLDER_ID in Render to skip
    # this lookup on every conversion
    env_id = os.environ.get("GOOGLE_DRIVE_ACTIVE_ENGAGEMENTS_FOLDER_ID")
    if env_id:
        return env_id

    q = (
        f"name = 'Active_Engagements' and "
        f"mimeType = '{FOLDER_MIME}' and "
        f"'{drive_id}' in parents and "
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
    if not files:
        raise ValueError(f"'Active_Engagements' folder not found in shared drive '{SHARED_DRIVE_NAME}'")
    return files[0]["id"]


def _create_folder(service, name: str, parent_id: str) -> str:
    """Create a folder in Drive and return its ID."""
    metadata = {
        "name": name,
        "mimeType": FOLDER_MIME,
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=metadata,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return folder["id"]
