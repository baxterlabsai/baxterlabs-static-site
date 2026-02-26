from __future__ import annotations

import os
import smtplib
import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

logger = logging.getLogger("baxterlabs.email")

# Brand colors
CRIMSON = "#66151C"
TEAL = "#005454"
GOLD = "#C9A84C"
CHARCOAL = "#2D3436"
IVORY = "#FAF8F2"

PARTNER_EMAIL = "george@baxterlabs.ai"


class EmailService:
    def __init__(self):
        self.development_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@baxterlabs.ai")
        self.from_name = os.getenv("FROM_NAME", "BaxterLabs Advisory")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def _wrap_html(self, body_content: str) -> str:
        """Wrap email body in branded BaxterLabs template."""
        return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:{IVORY};font-family:'Inter',Arial,Helvetica,sans-serif;color:{CHARCOAL};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{IVORY};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background-color:{CRIMSON};padding:24px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#ffffff;font-family:Georgia,serif;">BaxterLabs Advisory</span>
        </td></tr>
        <tr><td style="height:3px;background-color:{GOLD};"></td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          {body_content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="height:1px;background-color:{GOLD};"></td></tr>
        <tr><td style="background-color:{TEAL};padding:20px;text-align:center;">
          <span style="color:rgba(255,255,255,0.7);font-size:12px;">&copy; 2026 BaxterLabs Advisory &middot; baxterlabs.ai</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    def _send_email(self, to_email: str, subject: str, html_body: str) -> dict:
        """Core send method using SMTP."""
        full_html = self._wrap_html(html_body)

        if self.development_mode:
            logger.info(f"[DEV MODE] Email to={to_email} subject='{subject}'")
            logger.debug(f"[DEV MODE] Body preview: {html_body[:200]}...")
            return {
                "success": True,
                "mode": "development",
                "to": to_email,
                "subject": subject,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            text_part = MIMEText(f"This email requires an HTML-capable email client. Subject: {subject}", "plain")
            html_part = MIMEText(full_html, "html")
            msg.attach(text_part)
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                smtp_response = server.send_message(msg)
                logger.info(f"SMTP response for to={to_email}: {smtp_response}")

            logger.info(f"Email sent to={to_email} subject='{subject}'")
            return {
                "success": True,
                "mode": "production",
                "to": to_email,
                "subject": subject,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Email failed to={to_email}: {e}")
            return {"success": False, "error": str(e)}

    # ── Notification Templates ──────────────────────────────────────

    def send_intake_notification(self, engagement: dict) -> dict:
        """Notify partner: new intake form submitted."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact = client.get("primary_contact_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">New Intake Received</h2>
        <p>A new intake form has been submitted.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Company</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{company}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Primary Contact</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{contact}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Industry</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{client.get("industry", "—")}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Revenue Range</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{client.get("revenue_range", "—")}</td></tr>
        </table>
        <p style="color:{TEAL};font-weight:600;">NDA will be sent automatically.</p>
        """
        return self._send_email(PARTNER_EMAIL, f"New Intake: {company}", body)

    def send_nda_signed_notification(self, engagement: dict) -> dict:
        """Notify partner: client signed the NDA."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">NDA Signed</h2>
        <p><strong>{company}</strong> has signed the NDA.</p>
        <p>Company research has been triggered automatically. You will receive another notification when the dossier is ready.</p>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"NDA Signed: {company}", body)

    def send_research_ready_notification(self, engagement: dict, research_type: str) -> dict:
        """Notify partner: research dossier or interview briefs are ready."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        label = "Company Dossier" if research_type == "company_dossier" else "Interview Briefs"
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Research Ready</h2>
        <p><strong>{label}</strong> for <strong>{company}</strong> are now available.</p>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            Review Research
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"Research Ready: {company} — {label}", body)

    def send_agreement_signed_notification(self, engagement: dict) -> dict:
        """Notify partner: client signed the engagement agreement."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Agreement Signed</h2>
        <p><strong>{company}</strong> has signed the Engagement Agreement.</p>
        <p>Upload portal link will be sent to the client automatically.</p>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"Agreement Signed: {company}", body)

    def send_upload_link(self, engagement: dict) -> dict:
        """Send client their secure upload portal link with required items list."""
        from config.upload_checklist import REQUIRED_ITEMS

        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        upload_token = engagement.get("upload_token")

        required_list = "".join(
            f'<li style="padding:4px 0;color:{CHARCOAL};">{item["name"]}</li>'
            for item in REQUIRED_ITEMS
        )

        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Your Document Upload Portal</h2>
        <p>Hi {contact_name},</p>
        <p>Your BaxterLabs engagement is underway. Please use the secure link below to upload the requested documents.</p>
        <p style="margin:24px 0;text-align:center;">
          <a href="{self.frontend_url}/upload/{upload_token}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            Open Upload Portal
          </a>
        </p>
        <p style="font-weight:600;color:{TEAL};margin-top:24px;">Required Documents ({len(REQUIRED_ITEMS)} items):</p>
        <ul style="margin:8px 0 24px;padding-left:20px;font-size:14px;">
          {required_list}
        </ul>
        <p style="color:{CHARCOAL};font-size:14px;">This link is unique to your engagement. Do not share it with anyone outside your organization.</p>
        """
        return self._send_email(contact_email, f"BaxterLabs — Document Upload Portal for {company}", body)

    def send_document_uploaded_notification(self, engagement: dict, filename: str, item_display_name: str, category: str) -> dict:
        """Notify partner: a client uploaded a document."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Document Uploaded</h2>
        <p>A new document has been uploaded for <strong>{company}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Item</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{item_display_name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Category</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{category.title()}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Filename</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{filename}</td></tr>
        </table>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"Document Uploaded: {company} — {item_display_name}", body)

    def send_upload_complete_notification(self, engagement: dict) -> dict:
        """Notify partner: client has submitted all documents."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Documents Received</h2>
        <p>All required documents have been received from <strong>{company}</strong>.</p>
        <p>The engagement is ready to begin Phase 1.</p>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            Start Phase 1
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"Documents Received: {company}", body)

    def send_wave1_released(self, engagement: dict) -> dict:
        """Notify client: Wave 1 deliverables are available."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        deliverable_token = engagement.get("deliverable_token")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Your Deliverables Are Ready</h2>
        <p>Hi {contact_name},</p>
        <p>The BaxterLabs diagnostic for <strong>{company}</strong> is complete. Your deliverables are now available for download:</p>
        <ul style="margin:16px 0;padding-left:20px;">
          <li>Executive Summary</li>
          <li>Full Diagnostic Report</li>
          <li>Profit Leak Quantification Workbook</li>
          <li>90-Day Implementation Roadmap</li>
        </ul>
        <p style="margin:24px 0;text-align:center;">
          <a href="{self.frontend_url}/deliverables/{deliverable_token}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            View Deliverables
          </a>
        </p>
        """
        return self._send_email(contact_email, f"BaxterLabs Deliverables Ready — {company}", body)

    def send_wave2_released(self, engagement: dict) -> dict:
        """Notify client: Wave 2 deliverables (deck + retainer proposal) available."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        deliverable_token = engagement.get("deliverable_token")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Additional Materials Available</h2>
        <p>Hi {contact_name},</p>
        <p>Additional materials from your Executive Debrief are now available in your deliverable portal:</p>
        <ul style="margin:16px 0;padding-left:20px;">
          <li>Executive Presentation Deck</li>
          <li>Phase 2 Retainer Proposal</li>
        </ul>
        <p style="margin:24px 0;text-align:center;">
          <a href="{self.frontend_url}/deliverables/{deliverable_token}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            View Deliverables
          </a>
        </p>
        """
        return self._send_email(contact_email, f"BaxterLabs — Additional Materials for {company}", body)

    def send_deliverables_ready_notification(self, engagement: dict, wave: int = 1) -> dict:
        """Notify partner: deliverables from a wave are ready/released."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        wave_label = "Wave 1" if wave == 1 else "Wave 2"
        items = (
            "Executive Summary, Full Diagnostic Report, Profit Leak Workbook, 90-Day Roadmap"
            if wave == 1
            else "Presentation Deck, Phase 2 Retainer Proposal"
        )
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Deliverables Ready — {wave_label}</h2>
        <p><strong>{company}</strong> — {wave_label} deliverables have been released to the client.</p>
        <p><strong>Deliverables:</strong> {items}</p>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(PARTNER_EMAIL, f"Deliverables Ready — {company}", body)

    def send_reminder_nda(self, engagement: dict) -> dict:
        """Send client a reminder to sign the NDA."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Friendly Reminder: Sign Your NDA</h2>
        <p>Hi {contact_name},</p>
        <p>We noticed you haven't yet signed the Non-Disclosure Agreement for your engagement with BaxterLabs Advisory.</p>
        <p>Please check your email for the DocuSign envelope and complete the signature so we can get started. If you can't find it, please let us know and we'll resend it.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">— The BaxterLabs Team</p>
        """
        return self._send_email(contact_email, f"Reminder: Sign Your NDA — {company}", body)

    def send_reminder_agreement(self, engagement: dict) -> dict:
        """Send client a reminder to sign the Engagement Agreement."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Friendly Reminder: Sign Your Engagement Agreement</h2>
        <p>Hi {contact_name},</p>
        <p>We're ready to kick off your BaxterLabs engagement, but we're still waiting on your signed Engagement Agreement.</p>
        <p>Please check your email for the DocuSign envelope and complete the signature. If you can't find it, please let us know and we'll resend it.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">— The BaxterLabs Team</p>
        """
        return self._send_email(contact_email, f"Reminder: Sign Your Agreement — {company}", body)

    def send_reminder_documents(self, engagement: dict, uploaded_count: int, total_required: int) -> dict:
        """Send client a reminder to upload outstanding documents."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        upload_token = engagement.get("upload_token")
        remaining = total_required - uploaded_count
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Friendly Reminder: Upload Your Documents</h2>
        <p>Hi {contact_name},</p>
        <p>We're making progress on your BaxterLabs engagement, but we're still waiting on some documents from your team.</p>
        <p><strong>Status:</strong> {uploaded_count} of {total_required} required documents uploaded ({remaining} remaining).</p>
        <p>Please use the secure link below to upload the remaining items:</p>
        <p style="margin:24px 0;text-align:center;">
          <a href="{self.frontend_url}/upload/{upload_token}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            Open Upload Portal
          </a>
        </p>
        <p style="color:{TEAL};font-weight:600;">— The BaxterLabs Team</p>
        """
        return self._send_email(contact_email, f"Reminder: Upload Documents — {company}", body)

    def send_engagement_archived(self, engagement: dict) -> dict:
        """Notify partner: engagement has been archived."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Engagement Archived</h2>
        <p>The engagement for <strong>{company}</strong> has been archived.</p>
        <p>All files have been moved to the archive bucket and the engagement is now closed.</p>
        """
        return self._send_email(PARTNER_EMAIL, f"Engagement Archived: {company}", body)


# Singleton
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
