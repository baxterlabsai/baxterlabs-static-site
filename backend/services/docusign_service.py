"""DocuSign integration — placeholder for Milestone 2."""


def send_nda(engagement_id: str, contact_email: str, contact_name: str, company_name: str) -> dict:
    raise NotImplementedError("DocuSign NDA — Milestone 2")


def send_agreement(engagement_id: str, contact_email: str, fee: float, start_date: str, end_date: str) -> dict:
    raise NotImplementedError("DocuSign Agreement — Milestone 2")


def handle_webhook(payload: dict) -> dict:
    raise NotImplementedError("DocuSign Webhook — Milestone 2")
