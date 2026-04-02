"""Router for Phase 7 Document Packaging — render .md files into branded .docx/.pptx."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import get_engagement_by_id
from services.document_renderer import render_engagement_deliverables

logger = logging.getLogger("baxterlabs.renderer")

router = APIRouter(prefix="/api", tags=["renderer"])


@router.post("/engagements/{engagement_id}/render-deliverables")
async def trigger_render(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Render QC-approved markdown files into branded .docx/.pptx deliverables.

    Downloads .md files from the engagement's 04_Deliverables Drive folder,
    applies each to its corresponding template, and uploads the rendered
    files back to the same Drive folder.
    """
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    if not eng.get("drive_deliverables_folder_id"):
        raise HTTPException(
            status_code=400,
            detail="Engagement has no Google Drive deliverables folder configured",
        )

    try:
        result = await render_engagement_deliverables(engagement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Render failed for engagement %s: %s", engagement_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rendering failed: {e}")

    rendered = result.get("rendered", [])
    skipped = result.get("skipped", [])

    return {
        "success": True,
        "rendered_count": len(rendered),
        "rendered": [r["output_file"] for r in rendered],
        "files": rendered,
        "skipped": skipped,
    }
