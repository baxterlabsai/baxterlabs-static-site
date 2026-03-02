"""DocuSign integration — JWT Grant auth, NDA envelope sending, webhook handling."""

from __future__ import annotations

import os
import time
import base64
import logging
from typing import Optional
from datetime import datetime, timezone

from docusign_esign import (
    ApiClient,
    EnvelopesApi,
    EnvelopeDefinition,
    Document,
    Signer,
    SignHere,
    DateSigned,
    FullName,
    Tabs,
    Recipients,
    EventNotification,
    EnvelopeEvent,
    RecipientEvent,
)
from docusign_esign.client.api_exception import ApiException

logger = logging.getLogger("baxterlabs.docusign")

SCOPES = ["signature", "impersonation"]
TOKEN_LIFETIME = 3600  # 1 hour
TOKEN_REFRESH_BUFFER = 600  # refresh 10 min before expiry


class DocuSignService:
    def __init__(self):
        self.client_id = os.getenv("DOCUSIGN_INTEGRATION_KEY", "")
        self.account_id = os.getenv("DOCUSIGN_ACCOUNT_ID", "")
        self.user_id = os.getenv("DOCUSIGN_USER_ID", "")
        self.auth_server = os.getenv("DOCUSIGN_AUTH_SERVER", "account-d.docusign.com")
        self.base_url = os.getenv("DOCUSIGN_BASE_URL", "https://demo.docusign.net/restapi")
        self.webhook_url = os.getenv("DOCUSIGN_WEBHOOK_URL", "")

        raw_key = os.getenv("DOCUSIGN_RSA_PRIVATE_KEY", "")
        # Handle literal \n from .env files (dotenv doesn't expand escape sequences)
        if raw_key and "\\n" in raw_key:
            raw_key = raw_key.replace("\\n", "\n")
        self.private_key_bytes = raw_key.encode("utf-8") if raw_key else b""

        self._dev_mode = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
        self._access_token: Optional[str] = None
        self._token_expires: float = 0
        self._api_client: Optional[ApiClient] = None
        self._ds_account_id: Optional[str] = None

    def _is_configured(self) -> bool:
        return bool(self.client_id and self.user_id and self.private_key_bytes)

    def _need_token_refresh(self) -> bool:
        return (
            self._access_token is None
            or (time.time() + TOKEN_REFRESH_BUFFER) >= self._token_expires
        )

    def _authenticate(self) -> None:
        """Authenticate via JWT Grant and configure the API client."""
        if not self._is_configured():
            raise RuntimeError("DocuSign is not configured — missing env vars")

        api_client = ApiClient()
        api_client.set_base_path(self.auth_server)
        api_client.set_oauth_host_name(self.auth_server)

        try:
            token_response = api_client.request_jwt_user_token(
                client_id=self.client_id,
                user_id=self.user_id,
                oauth_host_name=self.auth_server,
                private_key_bytes=self.private_key_bytes,
                expires_in=TOKEN_LIFETIME,
                scopes=SCOPES,
            )
        except ApiException as e:
            body = e.body.decode("utf-8") if isinstance(e.body, bytes) else str(e.body)
            if "consent_required" in body:
                consent_url = self.get_consent_url()
                raise RuntimeError(
                    f"DocuSign consent required. Visit this URL to grant consent: {consent_url}"
                )
            raise

        self._access_token = token_response.access_token
        self._token_expires = time.time() + TOKEN_LIFETIME

        # Get account info
        user_info = api_client.get_user_info(self._access_token)
        accounts = user_info.get_accounts()
        account = accounts[0]
        for acct in accounts:
            if acct.is_default == "true":
                account = acct
                break

        self._ds_account_id = account.account_id
        base_path = account.base_uri + "/restapi"

        # Reconfigure client for API calls
        api_client.host = base_path
        api_client.set_default_header("Authorization", f"Bearer {self._access_token}")
        self._api_client = api_client

        logger.info(f"DocuSign authenticated — account_id={self._ds_account_id}")

    def _ensure_auth(self) -> None:
        if self._need_token_refresh():
            self._authenticate()

    def get_consent_url(self) -> str:
        """Generate the one-time consent URL for the impersonated user."""
        scopes = "+".join(SCOPES)
        redirect_uri = "https://developers.docusign.com/platform/auth/consent"
        return (
            f"https://{self.auth_server}/oauth/auth?"
            f"response_type=code&"
            f"scope={scopes}&"
            f"client_id={self.client_id}&"
            f"redirect_uri={redirect_uri}"
        )

    def _build_nda_html(self, company_name: str, contact_name: str) -> str:
        """Generate the NDA document as HTML."""
        today = datetime.now(timezone.utc).strftime("%B %d, %Y")
        return f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: 'Georgia', serif; color: #2D3436; line-height: 1.6; margin: 40px; }}
  h1 {{ color: #66151C; text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 16px; }}
  h2 {{ color: #005454; margin-top: 24px; }}
  .header {{ text-align: center; margin-bottom: 32px; }}
  .header .logo {{ font-size: 24px; font-weight: bold; color: #66151C; }}
  .parties {{ background: #FAF8F2; padding: 16px; border-radius: 8px; margin: 16px 0; }}
  .signature-block {{ margin-top: 40px; page-break-inside: avoid; }}
  .sig-line {{ border-bottom: 1px solid #2D3436; width: 300px; margin-top: 40px; }}
</style>
</head>
<body>

<div class="header">
  <div class="logo">BaxterLabs Advisory</div>
  <p style="color: #C9A84C; margin-top: 4px;">Confidential</p>
</div>

<h1>Non-Disclosure Agreement</h1>

<p>This Non-Disclosure Agreement ("Agreement") is entered into as of <strong>{today}</strong> ("Effective Date") by and between:</p>

<div class="parties">
  <p><strong>Disclosing Party:</strong> {company_name}, represented by {contact_name} ("Client")</p>
  <p><strong>Receiving Party:</strong> BaxterLabs Advisory LLC, a Texas limited liability company ("BaxterLabs")</p>
</div>

<h2>1. Purpose</h2>
<p>The Client intends to disclose certain confidential information to BaxterLabs for the purpose of evaluating and conducting a profit leak diagnostic audit and related advisory services (the "Purpose").</p>

<h2>2. Definition of Confidential Information</h2>
<p>"Confidential Information" means all non-public information disclosed by Client to BaxterLabs, whether orally, in writing, or electronically, including but not limited to: financial statements, payroll records, vendor contracts, revenue data, operational processes, customer lists, pricing strategies, and any other business information marked or reasonably understood to be confidential.</p>

<h2>3. Obligations of Receiving Party</h2>
<p>BaxterLabs agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the Purpose; (d) protect Confidential Information with at least the same degree of care used to protect its own confidential information, but no less than reasonable care.</p>

<h2>4. Exclusions</h2>
<p>Confidential Information does not include information that: (a) is or becomes publicly available through no fault of BaxterLabs; (b) was known to BaxterLabs prior to disclosure; (c) is independently developed by BaxterLabs without use of Confidential Information; or (d) is required to be disclosed by law or court order, provided BaxterLabs gives prompt written notice.</p>

<h2>5. Return of Materials</h2>
<p>Upon completion of the engagement or upon Client's written request, BaxterLabs shall promptly return or destroy all Confidential Information and any copies thereof, and certify such destruction in writing.</p>

<h2>6. Term</h2>
<p>This Agreement shall remain in effect for a period of three (3) years from the Effective Date. The obligations of confidentiality shall survive termination.</p>

<h2>7. Governing Law</h2>
<p>This Agreement shall be governed by the laws of the State of Texas, without regard to conflict of law principles.</p>

<h2>8. Entire Agreement</h2>
<p>This Agreement constitutes the entire agreement between the parties concerning the subject matter hereof and supersedes all prior discussions and agreements.</p>

<div class="signature-block">
  <p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the Effective Date.</p>

  <table width="100%" style="margin-top: 32px;">
    <tr>
      <td width="50%">
        <p><strong>Client — {company_name}</strong></p>
        <p style="margin-top: 24px;">Signature:</p>
        <p><span style="color: white; font-size: 1px;">/sn1/</span></p>
        <p style="margin-top: 8px;">Name: <span style="color: white; font-size: 1px;">/fn1/</span></p>
        <p>Date: <span style="color: white; font-size: 1px;">/ds1/</span></p>
      </td>
      <td width="50%">
        <p><strong>BaxterLabs Advisory LLC</strong></p>
        <p style="margin-top: 24px;">Signature: <em>George DeVries</em></p>
        <p style="margin-top: 8px;">Name: George DeVries</p>
        <p>Title: Managing Partner</p>
        <p>Date: {today}</p>
      </td>
    </tr>
  </table>
</div>

</body>
</html>"""

    def _make_event_notification(self) -> Optional[EventNotification]:
        """Create webhook event notification if webhook URL is configured."""
        if not self.webhook_url:
            logger.info("No DOCUSIGN_WEBHOOK_URL configured — skipping event notification")
            return None

        return EventNotification(
            url=self.webhook_url,
            logging_enabled="true",
            require_acknowledgment="true",
            include_documents="false",
            include_envelope_void_reason="true",
            include_time_zone="true",
            include_sender_account_as_custom_field="true",
            include_document_fields="true",
            include_certificate_of_completion="false",
            envelope_events=[
                EnvelopeEvent(envelope_event_status_code="completed"),
                EnvelopeEvent(envelope_event_status_code="declined"),
                EnvelopeEvent(envelope_event_status_code="voided"),
            ],
            recipient_events=[
                RecipientEvent(recipient_event_status_code="Completed"),
                RecipientEvent(recipient_event_status_code="Declined"),
            ],
        )

    def send_nda(
        self,
        engagement_id: str,
        contact_email: str,
        contact_name: str,
        company_name: str,
    ) -> dict:
        """Generate and send NDA envelope via DocuSign."""
        logger.info(
            f"send_nda called — engagement/opp={engagement_id} "
            f"to={contact_email} contact={contact_name} company={company_name} "
            f"configured={self._is_configured()} dev_mode={self._dev_mode}"
        )
        self._ensure_auth()

        # Build NDA HTML
        nda_html = self._build_nda_html(company_name, contact_name)
        doc_b64 = base64.b64encode(nda_html.encode("utf-8")).decode("ascii")

        document = Document(
            document_base64=doc_b64,
            name=f"NDA — {company_name} & BaxterLabs Advisory",
            file_extension="html",
            document_id="1",
        )

        # Signer with anchor tabs
        signer = Signer(
            email=contact_email,
            name=contact_name,
            recipient_id="1",
            routing_order="1",
        )

        sign_here = SignHere(
            anchor_string="/sn1/",
            anchor_units="pixels",
            anchor_y_offset="-5",
            anchor_x_offset="0",
        )
        full_name = FullName(
            anchor_string="/fn1/",
            anchor_units="pixels",
            anchor_y_offset="-5",
            anchor_x_offset="0",
        )
        date_signed = DateSigned(
            anchor_string="/ds1/",
            anchor_units="pixels",
            anchor_y_offset="-5",
            anchor_x_offset="0",
        )

        signer.tabs = Tabs(
            sign_here_tabs=[sign_here],
            full_name_tabs=[full_name],
            date_signed_tabs=[date_signed],
        )

        envelope_definition = EnvelopeDefinition(
            email_subject=f"BaxterLabs Advisory — NDA for {company_name}",
            email_blurb=(
                f"Dear {contact_name},\n\n"
                f"Please review and sign the Non-Disclosure Agreement for your engagement "
                f"with BaxterLabs Advisory.\n\nThank you."
            ),
            documents=[document],
            recipients=Recipients(signers=[signer]),
            status="sent",
            custom_fields=None,
        )

        # Attach webhook if configured
        event_notification = self._make_event_notification()
        if event_notification:
            envelope_definition.event_notification = event_notification

        try:
            envelopes_api = EnvelopesApi(self._api_client)
            result = envelopes_api.create_envelope(
                account_id=self._ds_account_id,
                envelope_definition=envelope_definition,
            )

            logger.info(
                f"NDA sent — envelope_id={result.envelope_id} to={contact_email} "
                f"engagement={engagement_id}"
            )

            return {
                "success": True,
                "envelope_id": result.envelope_id,
                "status": result.status,
            }
        except ApiException as e:
            logger.error(
                f"DocuSign send_nda failed — engagement/opp={engagement_id} "
                f"to={contact_email} status_code={e.status} reason={e.reason} body={e.body}"
            )
            return {
                "success": False,
                "error": str(e),
            }

    def _build_agreement_html(
        self, company_name: str, contact_name: str, fee: float, start_date: str, end_date: str,
    ) -> str:
        """Generate the Engagement Agreement as HTML."""
        today = datetime.now(timezone.utc).strftime("%B %d, %Y")
        fee_str = f"${fee:,.0f}" if fee else "$12,500"
        return f"""<!DOCTYPE html>
<html>
<head>
<style>
  body {{ font-family: 'Georgia', serif; color: #2D3436; line-height: 1.6; margin: 40px; }}
  h1 {{ color: #66151C; text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 16px; }}
  h2 {{ color: #005454; margin-top: 24px; }}
  .header {{ text-align: center; margin-bottom: 32px; }}
  .header .logo {{ font-size: 24px; font-weight: bold; color: #66151C; }}
  .highlight {{ background: #FAF8F2; padding: 16px; border-radius: 8px; margin: 16px 0; }}
  .fee-box {{ background: #005454; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }}
  .fee-box .amount {{ font-size: 32px; font-weight: bold; color: #C9A84C; }}
</style>
</head>
<body>

<div class="header">
  <div class="logo">BaxterLabs Advisory</div>
  <p style="color: #C9A84C; margin-top: 4px;">Engagement Agreement</p>
</div>

<h1>Engagement Agreement</h1>

<p>This Engagement Agreement ("Agreement") is entered into as of <strong>{today}</strong> by and between:</p>

<div class="highlight">
  <p><strong>Client:</strong> {company_name}, represented by {contact_name}</p>
  <p><strong>Advisor:</strong> BaxterLabs Advisory LLC ("BaxterLabs")</p>
</div>

<h2>1. Scope of Work</h2>
<p>BaxterLabs will conduct a <strong>14-Day Profit Leak Diagnostic</strong> for {company_name}. The engagement includes:</p>
<ul>
  <li>Comprehensive review of financial statements, payroll, vendor contracts, and revenue data</li>
  <li>Up to 3 confidential interviews with key personnel</li>
  <li>AI-assisted analysis across 6 operational categories</li>
  <li>Board-ready deliverables including Executive Summary, Full Diagnostic Report, Profit Leak Quantification Workbook, and 90-Day Implementation Roadmap</li>
  <li>Executive Debrief presentation with Q&A</li>
</ul>

<h2>2. Engagement Fee</h2>
<div class="fee-box">
  <p style="margin: 0;">Fixed Fee — All Inclusive</p>
  <p class="amount" style="margin: 8px 0;">{fee_str}</p>
  <p style="margin: 0; font-size: 14px; opacity: 0.8;">No hourly billing. No surprises. No scope creep charges.</p>
</div>
<p><strong>Payment Terms:</strong> 50% due upon signing ({f"${fee/2:,.0f}" if fee else "$6,250"}), 50% due upon delivery of Wave 1 deliverables ({f"${fee/2:,.0f}" if fee else "$6,250"}).</p>

<h2>3. Timeline</h2>
<p><strong>Start Date:</strong> {start_date or "To be confirmed"}</p>
<p><strong>Target Completion:</strong> {end_date or "14 business days from start"}</p>
<p>BaxterLabs will deliver Wave 1 deliverables within 14 business days of receiving all requested documents.</p>

<h2>4. Client Responsibilities</h2>
<p>Client agrees to: (a) provide all requested documents within 5 business days of the data request; (b) make designated interview contacts available within the engagement timeline; (c) designate a single point of contact for communication.</p>

<h2>5. Confidentiality</h2>
<p>This engagement is subject to the Non-Disclosure Agreement previously executed between the parties. All information shared remains confidential per the terms of that agreement.</p>

<h2>6. Limitation of Liability</h2>
<p>BaxterLabs' total liability under this Agreement shall not exceed the engagement fee. BaxterLabs provides advisory services only and does not guarantee specific financial outcomes.</p>

<h2>7. Termination</h2>
<p>Either party may terminate this Agreement with 5 business days written notice. If Client terminates after work has begun, the initial 50% payment is non-refundable.</p>

<h2>8. Governing Law</h2>
<p>This Agreement shall be governed by the laws of the State of Texas.</p>

<div style="margin-top: 40px; page-break-inside: avoid;">
  <p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement.</p>

  <table width="100%" style="margin-top: 32px;">
    <tr>
      <td width="50%">
        <p><strong>Client — {company_name}</strong></p>
        <p style="margin-top: 24px;">Signature:</p>
        <p><span style="color: white; font-size: 1px;">/sn1/</span></p>
        <p style="margin-top: 8px;">Name: <span style="color: white; font-size: 1px;">/fn1/</span></p>
        <p>Date: <span style="color: white; font-size: 1px;">/ds1/</span></p>
      </td>
      <td width="50%">
        <p><strong>BaxterLabs Advisory LLC</strong></p>
        <p style="margin-top: 24px;">Signature:</p>
        <p><span style="color: white; font-size: 1px;">/sn2/</span></p>
        <p style="margin-top: 8px;">Name: George DeVries</p>
        <p>Title: Managing Partner</p>
        <p>Date: <span style="color: white; font-size: 1px;">/ds2/</span></p>
      </td>
    </tr>
  </table>
</div>

</body>
</html>"""

    def send_agreement(
        self,
        engagement_id: str,
        contact_email: str,
        contact_name: str,
        company_name: str,
        fee: float,
        start_date: str,
        end_date: str,
    ) -> dict:
        """Generate and send Engagement Agreement envelope via DocuSign (two signers)."""
        logger.info(
            f"send_agreement called — engagement/opp={engagement_id} "
            f"to={contact_email} contact={contact_name} company={company_name} "
            f"fee={fee} configured={self._is_configured()} dev_mode={self._dev_mode}"
        )
        self._ensure_auth()

        agreement_html = self._build_agreement_html(
            company_name, contact_name, fee, start_date, end_date,
        )
        doc_b64 = base64.b64encode(agreement_html.encode("utf-8")).decode("ascii")

        document = Document(
            document_base64=doc_b64,
            name=f"Engagement Agreement — {company_name} & BaxterLabs Advisory",
            file_extension="html",
            document_id="1",
        )

        # Signer 1: Client
        client_signer = Signer(
            email=contact_email,
            name=contact_name,
            recipient_id="1",
            routing_order="1",
        )
        client_signer.tabs = Tabs(
            sign_here_tabs=[SignHere(
                anchor_string="/sn1/", anchor_units="pixels",
                anchor_y_offset="-5", anchor_x_offset="0",
            )],
            full_name_tabs=[FullName(
                anchor_string="/fn1/", anchor_units="pixels",
                anchor_y_offset="-5", anchor_x_offset="0",
            )],
            date_signed_tabs=[DateSigned(
                anchor_string="/ds1/", anchor_units="pixels",
                anchor_y_offset="-5", anchor_x_offset="0",
            )],
        )

        # Signer 2: BaxterLabs (George)
        partner_email = os.getenv("PARTNER_EMAIL", "george@baxterlabs.ai")
        partner_signer = Signer(
            email=partner_email,
            name="George DeVries",
            recipient_id="2",
            routing_order="2",
        )
        partner_signer.tabs = Tabs(
            sign_here_tabs=[SignHere(
                anchor_string="/sn2/", anchor_units="pixels",
                anchor_y_offset="-5", anchor_x_offset="0",
            )],
            date_signed_tabs=[DateSigned(
                anchor_string="/ds2/", anchor_units="pixels",
                anchor_y_offset="-5", anchor_x_offset="0",
            )],
        )

        envelope_definition = EnvelopeDefinition(
            email_subject=f"BaxterLabs Advisory — Engagement Agreement for {company_name}",
            email_blurb=(
                f"Dear {contact_name},\n\n"
                f"Please review and sign the Engagement Agreement for your "
                f"14-Day Profit Leak Diagnostic with BaxterLabs Advisory.\n\nThank you."
            ),
            documents=[document],
            recipients=Recipients(signers=[client_signer, partner_signer]),
            status="sent",
        )

        event_notification = self._make_event_notification()
        if event_notification:
            envelope_definition.event_notification = event_notification

        try:
            envelopes_api = EnvelopesApi(self._api_client)
            result = envelopes_api.create_envelope(
                account_id=self._ds_account_id,
                envelope_definition=envelope_definition,
            )

            logger.info(
                f"Agreement sent — envelope_id={result.envelope_id} to={contact_email} "
                f"engagement={engagement_id}"
            )

            return {
                "success": True,
                "envelope_id": result.envelope_id,
                "status": result.status,
            }
        except ApiException as e:
            logger.error(f"DocuSign send_agreement failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    def _lookup_doc_type(self, envelope_id: str) -> str:
        """Look up document type from legal_documents or pipeline_opportunities.

        Returns: 'nda', 'agreement', 'pipeline_nda', or 'pipeline_agreement'.
        """
        try:
            from services.supabase_client import get_supabase
            sb = get_supabase()

            # Check legal_documents first (engagement-level)
            result = (
                sb.table("legal_documents")
                .select("type")
                .eq("docusign_envelope_id", envelope_id)
                .execute()
            )
            if result.data:
                return result.data[0]["type"]

            # Check pipeline_opportunities NDA envelope
            pipeline_nda = (
                sb.table("pipeline_opportunities")
                .select("id")
                .eq("nda_envelope_id", envelope_id)
                .eq("is_deleted", False)
                .execute()
            )
            if pipeline_nda.data:
                return "pipeline_nda"

            # Check pipeline_opportunities agreement envelope
            pipeline_agreement = (
                sb.table("pipeline_opportunities")
                .select("id")
                .eq("agreement_envelope_id", envelope_id)
                .eq("is_deleted", False)
                .execute()
            )
            if pipeline_agreement.data:
                return "pipeline_agreement"

        except Exception as e:
            logger.warning(f"Could not look up doc type for {envelope_id}: {e}")
        return "nda"  # default fallback

    def handle_webhook(self, payload: dict) -> dict:
        """Process DocuSign webhook callback. Returns action based on doc type."""
        envelope_id = ""
        event_type = ""

        # JSON SIM format (Connect 2.0)
        if "event" in payload and "data" in payload:
            event_type = payload["event"]
            envelope_id = payload["data"].get("envelopeId", "")
        # Legacy format
        elif "EnvelopeStatus" in payload:
            status = payload.get("EnvelopeStatus", {}).get("Status", "")
            envelope_id = payload.get("EnvelopeStatus", {}).get("EnvelopeID", "")
            if status == "Completed":
                event_type = "envelope-completed"
            elif status == "Declined":
                event_type = "envelope-declined"

        if not envelope_id:
            return {"action": "unknown", "raw": payload}

        logger.info(f"DocuSign webhook — event={event_type} envelope_id={envelope_id}")

        # Look up document type to differentiate NDA vs Agreement
        doc_type = self._lookup_doc_type(envelope_id)

        if event_type == "envelope-completed":
            action_map = {
                "nda": "nda_signed",
                "agreement": "agreement_signed",
                "pipeline_nda": "pipeline_nda_signed",
                "pipeline_agreement": "pipeline_agreement_signed",
            }
            action = action_map.get(doc_type, "nda_signed")
            return {"action": action, "envelope_id": envelope_id}
        elif event_type == "envelope-declined":
            action_map = {
                "nda": "nda_declined",
                "agreement": "agreement_declined",
                "pipeline_nda": "pipeline_nda_declined",
                "pipeline_agreement": "pipeline_agreement_declined",
            }
            action = action_map.get(doc_type, "nda_declined")
            return {"action": action, "envelope_id": envelope_id}
        elif event_type == "envelope-voided":
            return {"action": f"{doc_type}_voided", "envelope_id": envelope_id}

        return {"action": "unknown", "raw": payload}


# Singleton
_docusign_service: Optional[DocuSignService] = None


def get_docusign_service() -> DocuSignService:
    global _docusign_service
    if _docusign_service is None:
        _docusign_service = DocuSignService()
    return _docusign_service
