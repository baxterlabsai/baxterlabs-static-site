from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/docusign", tags=["docusign"])


@router.post("/send-nda")
async def send_nda(engagement_id: str):
    """Send NDA to client via DocuSign. Placeholder for Milestone 2."""
    raise HTTPException(status_code=501, detail="DocuSign NDA — not yet implemented (Milestone 2)")


@router.post("/send-agreement")
async def send_agreement(engagement_id: str):
    """Send Engagement Agreement via DocuSign. Placeholder for Milestone 2."""
    raise HTTPException(status_code=501, detail="DocuSign Agreement — not yet implemented (Milestone 2)")


@router.post("/webhook")
async def docusign_webhook(request: Request):
    """Receive DocuSign Connect webhook callbacks. Placeholder for Milestone 2."""
    raise HTTPException(status_code=501, detail="DocuSign Webhook — not yet implemented (Milestone 2)")
