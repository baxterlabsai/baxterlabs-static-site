"""Gmail draft creation — create drafts via Google OAuth refresh token."""

from __future__ import annotations

import base64
import os
import logging
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders
from typing import List, Optional

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

logger = logging.getLogger("baxterlabs.gmail")


def _get_gmail_service():
    """Build authenticated Gmail service using OAuth refresh token."""
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN")
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")

    if not all([refresh_token, client_id, client_secret]):
        missing = [
            name for name, val in [
                ("GOOGLE_REFRESH_TOKEN", refresh_token),
                ("GOOGLE_CLIENT_ID", client_id),
                ("GOOGLE_CLIENT_SECRET", client_secret),
            ]
            if not val
        ]
        raise ValueError(
            f"Missing required OAuth environment variables: {', '.join(missing)}. "
            "Set these in ~/Projects/master.env to use Gmail draft creation."
        )

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/gmail.compose"],
    )
    creds.refresh(Request())
    return build("gmail", "v1", credentials=creds)


def create_gmail_draft(
    to_email: str,
    to_name: str,
    subject: str,
    body_html: str,
) -> str:
    """Create a Gmail draft with an HTML body.

    Args:
        to_email: Recipient email address.
        to_name: Recipient display name.
        subject: Email subject line.
        body_html: HTML content for the email body.

    Returns:
        The Gmail draft ID.

    Raises:
        ValueError: If OAuth credentials are not configured.
    """
    logger.info("Creating Gmail draft to=%s subject=%r", to_email, subject)

    service = _get_gmail_service()

    message = MIMEText(body_html, "html")
    message["to"] = f"{to_name} <{to_email}>" if to_name else to_email
    message["subject"] = subject

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": raw}})
        .execute()
    )

    draft_id = draft["id"]
    logger.info("Gmail draft created: draft_id=%s", draft_id)
    return draft_id


def create_gmail_draft_with_attachments(
    to_email: str,
    to_name: str,
    subject: str,
    body_html: str,
    attachments: Optional[List[dict]] = None,
) -> str:
    """Create a Gmail draft with an HTML body and optional file attachments.

    Args:
        to_email: Recipient email address.
        to_name: Recipient display name.
        subject: Email subject line.
        body_html: HTML content for the email body.
        attachments: List of dicts with keys: filename (str), content (bytes), mimetype (str).

    Returns:
        The Gmail draft ID.
    """
    logger.info(
        "Creating Gmail draft with %d attachments to=%s subject=%r",
        len(attachments or []), to_email, subject,
    )

    service = _get_gmail_service()

    msg = MIMEMultipart()
    msg["to"] = f"{to_name} <{to_email}>" if to_name else to_email
    msg["subject"] = subject
    msg.attach(MIMEText(body_html, "html"))

    for att in (attachments or []):
        maintype, subtype = att["mimetype"].split("/", 1) if "/" in att["mimetype"] else ("application", "octet-stream")
        part = MIMEBase(maintype, subtype)
        part.set_payload(att["content"])
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", "attachment", filename=att["filename"])
        msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": raw}})
        .execute()
    )

    draft_id = draft["id"]
    logger.info("Gmail draft with attachments created: draft_id=%s", draft_id)
    return draft_id
