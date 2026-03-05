"""Google Drive archiving — upload signed legal documents via OAuth refresh token."""

from __future__ import annotations

import os
import io
import logging
from datetime import datetime

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

logger = logging.getLogger("baxterlabs.google_drive")


def _get_drive_service():
    """Build authenticated Google Drive service using OAuth refresh token."""
    creds = Credentials(
        token=None,
        refresh_token=os.environ.get("GOOGLE_REFRESH_TOKEN"),
        client_id=os.environ.get("GOOGLE_CLIENT_ID"),
        client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/drive"],
    )
    creds.refresh(Request())
    return build("drive", "v3", credentials=creds)


def _get_or_create_folder(service, parent_id: str, folder_name: str) -> str:
    """Get or create a subfolder inside parent_id. Returns the folder ID."""
    query = (
        f"name = '{folder_name}' and "
        f"'{parent_id}' in parents and "
        f"mimeType = 'application/vnd.google-apps.folder' and "
        f"trashed = false"
    )
    results = service.files().list(
        q=query,
        fields="files(id, name)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True,
    ).execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=metadata,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return folder["id"]


def upload_signed_document(pdf_bytes: bytes, document_label: str, client_name: str) -> str:
    """Upload a signed document PDF to Google Drive.

    Creates folder structure: Legal/{client_name} — {year}/{label} — {client} — {date}.pdf
    Returns the Drive file ID on success. Raises on failure (caller must handle).
    """
    service = _get_drive_service()
    legal_folder_id = os.environ.get("GOOGLE_DRIVE_LEGAL_FOLDER_ID")
    if not legal_folder_id:
        raise ValueError("GOOGLE_DRIVE_LEGAL_FOLDER_ID environment variable not set")

    year = datetime.utcnow().strftime("%Y")
    date_str = datetime.utcnow().strftime("%Y-%m-%d")

    client_folder_name = f"{client_name} — {year}"
    client_folder_id = _get_or_create_folder(service, legal_folder_id, client_folder_name)

    file_name = f"{document_label} — {client_name} — {date_str}.pdf"
    file_metadata = {
        "name": file_name,
        "parents": [client_folder_id],
    }
    media = MediaIoBaseUpload(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        resumable=False,
    )
    uploaded = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return uploaded.get("id")
