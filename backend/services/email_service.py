from __future__ import annotations

import os
import re
import smtplib
import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from datetime import datetime, timezone

logger = logging.getLogger("baxterlabs.email")

# Brand colors
CRIMSON = "#66151C"
TEAL = "#005454"
GOLD = "#C9A84C"
CHARCOAL = "#2D3436"
IVORY = "#FAF8F2"

# Three-tier sender addresses
EMAIL_ACCOUNTING = "accounting@baxterlabs.ai"
EMAIL_INFO = "info@baxterlabs.ai"

PARTNER_EMAILS = {
    "George DeVries": "george@baxterlabs.ai",
    "Alfonso Cordon": "alfonso@baxterlabs.ai",
}
DEFAULT_PARTNER_EMAIL = "george@baxterlabs.ai"


def get_partner_email(partner_lead: str) -> str:
    """Resolve partner_lead name to email. Defaults to George."""
    return PARTNER_EMAILS.get(partner_lead, DEFAULT_PARTNER_EMAIL)


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

    @staticmethod
    def _html_to_plain(html: str) -> str:
        """Convert HTML email body to readable plain text."""
        text = re.sub(r'<br\s*/?>', '\n', html)
        text = re.sub(r'</(?:p|div|tr|li|h[1-6])>', '\n', text)
        text = re.sub(r'<a[^>]+href="([^"]*)"[^>]*>[^<]*</a>', r'\1', text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'&nbsp;', ' ', text)
        text = re.sub(r'&amp;', '&', text)
        text = re.sub(r'&lt;', '<', text)
        text = re.sub(r'&gt;', '>', text)
        text = re.sub(r'&#\d+;', '', text)
        text = re.sub(r'&[a-zA-Z]+;', '', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        cc_email: Optional[str] = None,
    ) -> dict:
        """Core send method using SMTP."""
        full_html = self._wrap_html(html_body)
        sender_email = from_email or self.from_email
        sender_name = from_name or self.from_name

        if self.development_mode:
            logger.info(f"[DEV MODE] Email from={sender_name} <{sender_email}> to={to_email} cc={cc_email} subject='{subject}'")
            logger.debug(f"[DEV MODE] Body preview: {html_body[:200]}...")
            return {
                "success": True,
                "mode": "development",
                "to": to_email,
                "cc": cc_email,
                "from": f"{sender_name} <{sender_email}>",
                "subject": subject,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{sender_name} <{sender_email}>"
            msg["To"] = to_email
            if cc_email:
                msg["Cc"] = cc_email
            msg["Reply-To"] = sender_email
            msg["Message-ID"] = make_msgid(domain="baxterlabs.ai")
            msg["Date"] = formatdate(localtime=True)
            msg["X-Mailer"] = "BaxterLabs Advisory Platform"
            msg["List-Unsubscribe"] = "<mailto:info@baxterlabs.ai?subject=unsubscribe>"
            msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

            plain_text = self._html_to_plain(html_body)
            text_part = MIMEText(plain_text, "plain")
            html_part = MIMEText(full_html, "html")
            msg.attach(text_part)
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                smtp_response = server.send_message(msg)
                logger.info(f"SMTP response for to={to_email}: {smtp_response}")

            logger.info(f"Email sent from={sender_email} to={to_email} cc={cc_email} subject='{subject}'")
            return {
                "success": True,
                "mode": "production",
                "to": to_email,
                "cc": cc_email,
                "from": f"{sender_name} <{sender_email}>",
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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"New Intake: {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"NDA Signed: {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Research Ready: {company} — {label}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Agreement Signed: {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

    def send_upload_link(
        self,
        engagement: dict,
        document_contact_name: Optional[str] = None,
        document_contact_email: Optional[str] = None,
    ) -> dict:
        """Send document upload portal link.

        If document_contact_email is provided, send to them and CC the primary
        contact (the decision maker). Otherwise fall back to sending directly
        to the primary contact.
        """
        from config.upload_checklist import REQUIRED_ITEMS

        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        primary_name = client.get("primary_contact_name", "there")
        primary_email = client.get("primary_contact_email")
        upload_token = engagement.get("upload_token")

        # Determine recipient
        to_email = document_contact_email or primary_email
        to_name = document_contact_name or primary_name
        cc_email = primary_email if document_contact_email and document_contact_email != primary_email else None

        required_list = "".join(
            f'<li style="padding:4px 0;color:{CHARCOAL};">{item["name"]}</li>'
            for item in REQUIRED_ITEMS
        )

        # Context line differs based on whether a document contact was designated
        if document_contact_email and document_contact_email != primary_email:
            context = f"""<p><strong>{primary_name}</strong> at <strong>{company}</strong> has engaged BaxterLabs Advisory
            for a profit-leak diagnostic and has designated you as the point of contact for document uploads.</p>"""
        else:
            context = f"""<p>Your BaxterLabs engagement for <strong>{company}</strong> is underway.
            Please use the secure link below to upload the requested documents.</p>"""

        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Your Document Upload Portal</h2>
        <p>Hi {to_name},</p>
        {context}
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
        <p style="font-size:13px;color:{CHARCOAL};">We'd appreciate having documents uploaded within the first 3 business days to keep the engagement on schedule.</p>
        <p style="color:{CHARCOAL};font-size:13px;">This link is unique to your engagement. Do not share it with anyone outside your organization.</p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
        <p style="font-size:13px;color:{CHARCOAL};">Questions about what's needed? Contact <a href="mailto:george@baxterlabs.ai" style="color:{TEAL};">george@baxterlabs.ai</a></p>
        """
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            to_email, f"BaxterLabs — Document Upload Portal for {company}", body,
            from_email=p_email, from_name=p_name, cc_email=cc_email,
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Document Uploaded: {company} — {item_display_name}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Documents Received: {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email, f"BaxterLabs Deliverables Ready — {company}", body,
            from_email=p_email, from_name=p_name,
        )

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
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email, f"BaxterLabs — Additional Materials for {company}", body,
            from_email=p_email, from_name=p_name,
        )

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
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Deliverables Ready — {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

    # ── Pipeline Email Templates ─────────────────────────────────────

    def send_discovery_scheduling_link(
        self,
        to_email: str,
        contact_name: str,
        company_name: str,
        scheduling_link: str,
        partner_lead: str = "George DeVries",
    ) -> dict:
        """Send Calendly scheduling link to prospect."""
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Schedule Your Discovery Call</h2>
        <p>Hi {contact_name},</p>
        <p>Thank you for your interest in BaxterLabs Advisory. We'd love to learn more about <strong>{company_name}</strong> and explore how our Profit Leak Diagnostic can help.</p>
        <p>Please use the link below to schedule a discovery call at a time that works best for you:</p>
        <p style="margin:24px 0;text-align:center;">
          <a href="{scheduling_link}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            Schedule Discovery Call
          </a>
        </p>
        <p style="font-size:14px;color:{CHARCOAL};">This call typically lasts 30 minutes and is an opportunity for us to understand your business and discuss how we can help identify profit leaks.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">Looking forward to speaking with you!</p>
        """
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead} — BaxterLabs"
        return self._send_email(
            to_email, f"BaxterLabs — Schedule Your Discovery Call", body,
            from_email=p_email, from_name=p_name,
        )

    def send_nda_confirmation_link(
        self,
        to_email: str,
        contact_name: str,
        company_name: str,
        confirmation_url: str,
        booking_time: str,
        partner_lead: str = "George DeVries",
    ) -> dict:
        """Send confirmation page link with NDA option after Calendly booking."""
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Discovery Call Confirmed</h2>
        <p>Hi {contact_name},</p>
        <p>Your discovery call with BaxterLabs has been scheduled for <strong>{booking_time}</strong>.</p>
        <p>Before our call, we ask that you review and sign a Non-Disclosure Agreement (NDA). This ensures all information shared during our engagement remains strictly confidential.</p>
        <p style="margin:24px 0;text-align:center;">
          <a href="{confirmation_url}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            Review &amp; Sign NDA
          </a>
        </p>
        <p style="font-size:14px;color:{CHARCOAL};">Signing the NDA is quick and easy via DocuSign. It protects both parties and allows us to have an open, productive conversation.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">See you soon!</p>
        """
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead} — BaxterLabs"
        return self._send_email(
            to_email, f"BaxterLabs — Your Discovery Call is Confirmed", body,
            from_email=p_email, from_name=p_name,
        )

    def send_pipeline_nda_signed_notification(
        self,
        to_email: str,
        contact_name: str,
        company_name: str,
    ) -> dict:
        """Confirm to prospect that their NDA has been signed."""
        body = f"""
        <h2 style="color:{TEAL};font-family:Georgia,serif;margin-top:0;">NDA Signed — Thank You!</h2>
        <p>Hi {contact_name},</p>
        <p>Thank you for signing the Non-Disclosure Agreement for <strong>{company_name}</strong>.</p>
        <p>We're looking forward to your upcoming discovery call. In the meantime, if you have any questions, don't hesitate to reach out.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">— The BaxterLabs Team</p>
        """
        return self._send_email(
            to_email, f"BaxterLabs — NDA Signed Successfully", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

    def send_website_intake_notification(
        self,
        company_name: str,
        contact_name: str,
        contact_email: str,
        industry: Optional[str] = None,
        revenue_range: Optional[str] = None,
        pain_points: Optional[str] = None,
        source: str = "Website — Inbound",
    ) -> dict:
        """Notify partner of new inbound website lead."""
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">New Website Lead</h2>
        <p>A new prospect has submitted the Get Started form on the website.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Company</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{company_name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Contact</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{contact_name} ({contact_email})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Industry</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{industry or '—'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Revenue</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{revenue_range or '—'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Source</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{source}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Pain Points</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{pain_points or '—'}</td></tr>
        </table>
        <p style="color:{TEAL};font-weight:600;">Pipeline opportunity created at discovery_scheduled stage.</p>
        """
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"New Website Lead: {company_name}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

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
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email, f"Reminder: Sign Your NDA — {company}", body,
            from_email=p_email, from_name=p_name,
        )

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
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email, f"Reminder: Sign Your Agreement — {company}", body,
            from_email=p_email, from_name=p_name,
        )

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
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email, f"Reminder: Upload Documents — {company}", body,
            from_email=p_email, from_name=p_name,
        )

    # ── Invoice & Payment Templates ────────────────────────────────────

    def send_invoice(
        self,
        engagement: dict,
        invoice_number: str,
        invoice_type: str,
        amount: float,
        due_date: str,
        payment_link: Optional[str] = None,
    ) -> dict:
        """Send invoice to client with payment link."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        type_label = "Deposit (50%)" if invoice_type == "deposit" else "Final (50%)"
        amount_str = f"${amount:,.2f}"

        payment_button = ""
        if payment_link:
            payment_button = f"""
            <p style="margin:24px 0;text-align:center;">
              <a href="{payment_link}"
                 style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                Pay {amount_str} Now
              </a>
            </p>
            """

        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Invoice {invoice_number}</h2>
        <p>Hi {contact_name},</p>
        <p>Please find your invoice details below for the BaxterLabs Operational Diagnostic engagement.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Invoice #</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{invoice_number}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Type</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{type_label}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Amount Due</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:700;color:{CRIMSON};">{amount_str}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Due Date</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{due_date}</td></tr>
        </table>
        {payment_button}
        <p style="color:#6B7280;font-size:13px;">Payment is due within 14 days. If you have questions about this invoice, please contact info@baxterlabs.ai.</p>
        """
        return self._send_email(
            contact_email, f"BaxterLabs Invoice {invoice_number} — {company}", body,
            from_email=EMAIL_ACCOUNTING, from_name="BaxterLabs Accounting",
        )

    def send_payment_received(
        self,
        engagement: dict,
        invoice_number: str,
        amount: float,
    ) -> dict:
        """Send payment receipt/confirmation to client."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        amount_str = f"${amount:,.2f}"

        body = f"""
        <h2 style="color:{TEAL};font-family:Georgia,serif;margin-top:0;">Payment Received</h2>
        <p>Hi {contact_name},</p>
        <p>Thank you! We've received your payment of <strong>{amount_str}</strong> for invoice <strong>{invoice_number}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Invoice #</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{invoice_number}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Amount Paid</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:700;color:{TEAL};">{amount_str}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Status</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;"><span style="color:{TEAL};font-weight:600;">Paid</span></td></tr>
        </table>
        <p>No further action is required. We appreciate your prompt payment.</p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">— The BaxterLabs Team</p>
        """
        return self._send_email(
            contact_email, f"Payment Received — Invoice {invoice_number}", body,
            from_email=EMAIL_ACCOUNTING, from_name="BaxterLabs Accounting",
        )

    def send_payment_notification(
        self,
        engagement: dict,
        invoice_number: str,
        amount: float,
        method: str = "stripe",
    ) -> dict:
        """Notify partner that a payment was received."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        amount_str = f"${amount:,.2f}"
        method_label = "Stripe" if method == "stripe" else "Manual"

        body = f"""
        <h2 style="color:{TEAL};font-family:Georgia,serif;margin-top:0;">Payment Received</h2>
        <p><strong>{company}</strong> has paid invoice <strong>{invoice_number}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;width:140px;">Amount</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:700;color:{TEAL};">{amount_str}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #E5E7EB;font-weight:600;">Method</td>
              <td style="padding:8px;border-bottom:1px solid #E5E7EB;">{method_label}</td></tr>
        </table>
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement.get('id')}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Payment Received: {company} — {invoice_number}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )

    def send_invoice_overdue_reminder(
        self,
        engagement: dict,
        invoice_number: str,
        amount: float,
        due_date: str,
        payment_link: Optional[str] = None,
    ) -> dict:
        """Send overdue reminder to client."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        amount_str = f"${amount:,.2f}"

        payment_button = ""
        if payment_link:
            payment_button = f"""
            <p style="margin:24px 0;text-align:center;">
              <a href="{payment_link}"
                 style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
                Pay {amount_str} Now
              </a>
            </p>
            """

        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Payment Reminder</h2>
        <p>Hi {contact_name},</p>
        <p>This is a friendly reminder that invoice <strong>{invoice_number}</strong> for <strong>{amount_str}</strong> was due on <strong>{due_date}</strong>.</p>
        <p>Please arrange payment at your earliest convenience.</p>
        {payment_button}
        <p style="color:#6B7280;font-size:13px;">If you've already made this payment, please disregard this reminder. For questions, contact info@baxterlabs.ai.</p>
        """
        return self._send_email(
            contact_email, f"Payment Reminder — Invoice {invoice_number}", body,
            from_email=EMAIL_ACCOUNTING, from_name="BaxterLabs Accounting",
        )

    def send_engagement_confirmation_email(self, engagement: dict, client: dict, onboarding_token: str) -> dict:
        """Send welcome/confirmation email with onboarding link after agreement is signed."""
        company = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "there")
        contact_email = client.get("primary_contact_email")
        onboarding_url = f"{self.frontend_url}/onboard/{onboarding_token}"

        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Welcome to BaxterLabs</h2>
        <p>Hi {contact_name},</p>
        <p>Thank you for signing the Engagement Agreement for <strong>{company}</strong>. We're excited to get started on your Profit Leak Diagnostic.</p>

        <h3 style="color:{TEAL};font-family:Georgia,serif;margin-top:24px;">What Happens Next</h3>
        <ol style="color:{CHARCOAL};font-size:14px;line-height:1.8;">
          <li><strong>Identify Interview Contacts</strong> — Tell us who we should speak with (below)</li>
          <li><strong>Document Collection</strong> — Upload financial documents via a separate link</li>
          <li><strong>Confidential Interviews</strong> — We'll conduct 2-3 interviews with your team</li>
          <li><strong>14-Day Diagnostic</strong> — We analyze everything and deliver your report</li>
        </ol>

        <p style="margin-top:24px;">As part of the diagnostic, we'll be conducting confidential interviews with 2-3 members of your team. Please tell us who should participate and any context that would help us prepare effective questions.</p>

        <p style="margin:24px 0;text-align:center;">
          <a href="{onboarding_url}"
             style="display:inline-block;padding:14px 32px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
            Identify Interview Contacts
          </a>
        </p>

        <p style="font-size:13px;color:#6B7280;margin-top:24px;">You'll also receive a separate email with your document upload portal link.</p>

        <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
        <p style="font-size:13px;color:{CHARCOAL};">Questions? Reach out anytime at <a href="mailto:george@baxterlabs.ai" style="color:{TEAL};">george@baxterlabs.ai</a></p>
        """
        partner_lead = engagement.get("partner_lead", "")
        p_email = get_partner_email(partner_lead)
        p_name = f"{partner_lead or 'George DeVries'} — BaxterLabs"
        return self._send_email(
            contact_email,
            f"Welcome to BaxterLabs — Next Step: Identify Your Interview Contacts",
            body,
            from_email=p_email,
            from_name=p_name,
        )

    def send_onboarding_completed_notification(
        self,
        contact_name: str,
        company_name: str,
        contact_count: int,
        engagement_id: str,
        document_contact_name: Optional[str] = None,
    ) -> dict:
        """Notify partner that a client has submitted interview + document contacts."""
        doc_line = ""
        if document_contact_name:
            doc_line = f'<p>Document upload contact: <strong>{document_contact_name}</strong> (upload portal email sent).</p>'
        body = f"""
        <h2 style="color:{TEAL};font-family:Georgia,serif;margin-top:0;">Onboarding Complete</h2>
        <p><strong>{contact_name}</strong> has submitted <strong>{contact_count}</strong> interview contact{"s" if contact_count != 1 else ""} for <strong>{company_name}</strong>.</p>
        {doc_line}
        <p style="margin-top:24px;">
          <a href="{self.frontend_url}/dashboard/engagement/{engagement_id}"
             style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
            View Engagement
          </a>
        </p>
        """
        return self._send_email(
            DEFAULT_PARTNER_EMAIL,
            f"Onboarding Complete: {company_name}",
            body,
            from_email=EMAIL_INFO,
            from_name="BaxterLabs",
        )

    def send_engagement_archived(self, engagement: dict) -> dict:
        """Notify partner: engagement has been archived."""
        client = engagement.get("clients", {})
        company = client.get("company_name", "Unknown")
        body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">Engagement Archived</h2>
        <p>The engagement for <strong>{company}</strong> has been archived.</p>
        <p>All files have been moved to the archive bucket and the engagement is now closed.</p>
        """
        return self._send_email(
            DEFAULT_PARTNER_EMAIL, f"Engagement Archived: {company}", body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )


# Singleton
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
