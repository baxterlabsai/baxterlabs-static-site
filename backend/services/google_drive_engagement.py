"""Google Drive — create client engagement folder on BaxterLabs-Cowork shared drive."""

from __future__ import annotations

import io
import os
import logging
from datetime import date
from typing import List, Optional

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
    Returns folder IDs dict on success, None on failure.
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

        # 4. Create 6 subfolders and capture IDs
        subfolder_ids: dict = {}
        for folder_name in SUBFOLDERS:
            folder_id = _create_folder(service, folder_name, root_folder_id)
            subfolder_ids[folder_name] = folder_id

        logger.info(f"Created {len(SUBFOLDERS)} subfolders for engagement {engagement_id}")

        # 5. Upload signed PDF to 00_Engagement_Info/
        engagement_info_folder_id = subfolder_ids.get("00_Engagement_Info")
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
            "inbox_folder_id": subfolder_ids.get("01_Inbox"),
            "interviews_folder_id": subfolder_ids.get("02_Interviews"),
            "working_papers_folder_id": subfolder_ids.get("03_Working_Papers"),
            "deliverables_folder_id": subfolder_ids.get("04_Deliverables"),
            "qc_folder_id": subfolder_ids.get("05_QC"),
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


async def upload_file_to_drive_folder(
    folder_id: str,
    filename: str,
    file_bytes: bytes,
    mimetype: str,
) -> Optional[str]:
    """Upload a file to a specific Drive folder. Returns file ID or None on failure.

    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        media = MediaIoBaseUpload(
            io.BytesIO(file_bytes),
            mimetype=mimetype,
            resumable=False,
        )
        result = service.files().create(
            body={"name": filename, "parents": [folder_id]},
            media_body=media,
            fields="id",
            supportsAllDrives=True,
        ).execute()
        file_id = result["id"]
        logger.info(f"Uploaded '{filename}' to Drive folder {folder_id} — fileId={file_id}")
        return file_id
    except Exception as e:
        logger.error(f"Drive upload failed for '{filename}' to folder {folder_id}: {e}")
        return None


def move_file_to_folder(file_id: str, target_folder_id: str) -> bool:
    """Move an existing Drive file into target_folder_id.

    Uses the files().update API to add the new parent and remove old parents.
    Returns True on success, False on failure. Never raises.
    """
    try:
        service = _get_drive_service()
        # Get current parents
        file_meta = service.files().get(
            fileId=file_id,
            fields="parents",
            supportsAllDrives=True,
        ).execute()
        previous_parents = ",".join(file_meta.get("parents", []))
        service.files().update(
            fileId=file_id,
            addParents=target_folder_id,
            removeParents=previous_parents,
            fields="id, parents",
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Moved Drive file {file_id} to folder {target_folder_id}")
        return True
    except Exception as e:
        logger.error(f"Drive move failed for file {file_id} to folder {target_folder_id}: {e}")
        return False


async def list_files_in_folder(
    folder_id: str,
    extension: Optional[str] = None,
) -> List[dict]:
    """List files in a Drive folder (non-recursive).

    Returns list of ``{"id", "name", "mimeType", "modifiedTime", "size"}`` dicts.
    Optionally filter by file extension (e.g. ``".md"``).
    Never raises — returns empty list on failure.
    """
    try:
        service = _get_drive_service()
        items: List[dict] = []
        page_token = None

        while True:
            resp = service.files().list(
                q=f"'{folder_id}' in parents and trashed = false",
                fields="nextPageToken, files(id, name, mimeType, modifiedTime, size)",
                includeItemsFromAllDrives=True,
                supportsAllDrives=True,
                pageToken=page_token,
            ).execute()

            for f in resp.get("files", []):
                mime = f.get("mimeType", "")
                if mime == FOLDER_MIME:
                    continue
                if extension and not f["name"].lower().endswith(extension.lower()):
                    continue
                items.append({
                    "id": f["id"],
                    "name": f["name"],
                    "mimeType": mime,
                    "modifiedTime": f.get("modifiedTime"),
                    "size": f.get("size"),
                })

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        return items
    except Exception as e:
        logger.error(f"Drive list_files_in_folder failed for {folder_id}: {e}")
        return []


async def download_file_by_name(
    folder_id: str,
    filename: str,
) -> Optional[bytes]:
    """Download a single file from a Drive folder by filename.

    Searches the given folder for a file with the exact name, then downloads
    its content.  Returns the raw bytes, or None on failure.
    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        escaped = filename.replace("'", "\\'")
        result = service.files().list(
            q=f"'{folder_id}' in parents and name = '{escaped}' and trashed = false",
            fields="files(id, name)",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
        ).execute()
        files = result.get("files", [])
        if not files:
            logger.warning(f"File '{filename}' not found in folder {folder_id}")
            return None

        file_id_found = files[0]["id"]
        content = service.files().get_media(
            fileId=file_id_found,
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Downloaded '{filename}' from folder {folder_id} ({len(content)} bytes)")
        return content
    except Exception as e:
        logger.error(f"Drive download failed for '{filename}' in folder {folder_id}: {e}")
        return None


async def download_file_by_id(
    file_id: str,
) -> Optional[bytes]:
    """Download a single file from Drive by its file ID.

    Returns the raw bytes, or None on failure.
    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        content = service.files().get_media(
            fileId=file_id,
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Downloaded Drive file {file_id} ({len(content)} bytes)")
        return content
    except Exception as e:
        logger.error(f"Drive download failed for file {file_id}: {e}")
        return None


async def export_file_as_pdf(file_id: str) -> Optional[bytes]:
    """Export a Drive file (uploaded DOCX/PPTX/XLSX) as PDF via Google's converter.

    Google Drive can export any uploaded Office file as PDF without needing
    LibreOffice on the server.  Returns PDF bytes, or None on failure.
    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        # For uploaded Office files, we need to use export with the Google Docs
        # editor MIME type. But files uploaded as-is (not converted to Google
        # Docs) don't support export(). Instead, we use get_media() with
        # alt=media after converting.  The simplest approach: copy the file as
        # a Google Doc/Slides, export that copy as PDF, then delete the copy.

        # 1. Get the file's MIME type to determine the Google Docs equivalent
        meta = service.files().get(
            fileId=file_id,
            fields="name, mimeType",
            supportsAllDrives=True,
        ).execute()
        original_mime = meta.get("mimeType", "")
        fname = meta.get("name", "file")

        # Map Office MIME types to Google editor types
        google_mime_map = {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "application/vnd.google-apps.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": "application/vnd.google-apps.presentation",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "application/vnd.google-apps.spreadsheet",
            "application/msword": "application/vnd.google-apps.document",
            "application/vnd.ms-powerpoint": "application/vnd.google-apps.presentation",
            "application/vnd.ms-excel": "application/vnd.google-apps.spreadsheet",
        }

        google_mime = google_mime_map.get(original_mime)
        if not google_mime:
            # Already a Google Docs native type — export directly
            if original_mime.startswith("application/vnd.google-apps"):
                pdf_bytes = service.files().export(
                    fileId=file_id,
                    mimeType="application/pdf",
                ).execute()
                logger.info(f"Exported native Google file '{fname}' as PDF ({len(pdf_bytes)} bytes)")
                return pdf_bytes
            logger.warning(f"Cannot export '{fname}' (MIME: {original_mime}) as PDF — unsupported type")
            return None

        # 2. Copy the file as a Google Docs editor type
        copy_meta = service.files().copy(
            fileId=file_id,
            body={"name": f"_pdf_export_{fname}", "mimeType": google_mime},
            fields="id",
            supportsAllDrives=True,
        ).execute()
        copy_id = copy_meta["id"]

        try:
            # 3. Export the copy as PDF
            pdf_bytes = service.files().export(
                fileId=copy_id,
                mimeType="application/pdf",
            ).execute()
            logger.info(f"Exported '{fname}' as PDF via Google Drive ({len(pdf_bytes)} bytes)")
            return pdf_bytes
        finally:
            # 4. Always delete the temporary copy
            try:
                service.files().delete(fileId=copy_id, supportsAllDrives=True).execute()
            except Exception:
                logger.warning(f"Failed to delete temp copy {copy_id} for '{fname}'")

    except Exception as e:
        logger.error(f"Drive PDF export failed for file {file_id}: {e}")
        return None


async def delete_drive_file(file_id: str) -> bool:
    """Delete a file from Drive by file ID. Returns True on success, False on failure.

    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        service.files().delete(
            fileId=file_id,
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Deleted Drive file {file_id}")
        return True
    except Exception as e:
        logger.error(f"Drive delete failed for file {file_id}: {e}")
        return False


async def download_all_files_from_folder(
    folder_id: str,
) -> List[dict]:
    """Recursively download all files from a Drive folder.

    Returns list of {"name": str, "path": str, "bytes": bytes} dicts.
    Skips Google Docs native formats (mimeType starting with application/vnd.google-apps).
    Returns empty list on failure, never raises.
    """
    try:
        service = _get_drive_service()
        return _walk_and_download(service, folder_id, "")
    except Exception as e:
        logger.error(f"Drive folder download failed for {folder_id}: {e}")
        return []


def _walk_and_download(service, folder_id: str, prefix: str) -> List[dict]:
    """Recursively walk a Drive folder and download all files."""
    results: List[dict] = []
    page_token = None

    while True:
        resp = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            includeItemsFromAllDrives=True,
            supportsAllDrives=True,
            pageToken=page_token,
        ).execute()

        for item in resp.get("files", []):
            name = item["name"]
            mime = item.get("mimeType", "")
            rel_path = f"{prefix}/{name}" if prefix else name

            if mime == FOLDER_MIME:
                results.extend(_walk_and_download(service, item["id"], rel_path))
            elif mime.startswith("application/vnd.google-apps"):
                logger.debug(f"Skipping native Google format: {rel_path} ({mime})")
                continue
            else:
                try:
                    content = service.files().get_media(
                        fileId=item["id"],
                        supportsAllDrives=True,
                    ).execute()
                    results.append({
                        "name": name,
                        "path": rel_path,
                        "bytes": content,
                    })
                except Exception as e:
                    logger.warning(f"Failed to download Drive file {rel_path}: {e}")

        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return results


async def delete_drive_folder(folder_id: str) -> bool:
    """Delete a Drive folder and all its contents. Returns True on success.

    Never raises — all exceptions are caught and logged.
    """
    try:
        service = _get_drive_service()
        service.files().delete(
            fileId=folder_id,
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Deleted Drive folder {folder_id}")
        return True
    except Exception as e:
        logger.error(f"Drive folder delete failed for {folder_id}: {e}")
        return False
