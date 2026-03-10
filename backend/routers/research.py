from __future__ import annotations

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.research_service import research_company, research_contacts
from services.firecrawl_service import _merge_dossier_sections

logger = logging.getLogger("baxterlabs.research")

router = APIRouter(prefix="/api", tags=["research"])


def _run_async_in_background(coro):
    """Helper to run an async coroutine from a sync BackgroundTask."""
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


async def _enrich_company_research(engagement_id: str) -> None:
    """Run Firecrawl research and merge results into existing dossier."""
    sb = get_supabase()

    # 1. Pull existing dossier
    existing = (
        sb.table("research_documents")
        .select("id, content")
        .eq("engagement_id", engagement_id)
        .eq("type", "company_dossier")
        .execute()
    )
    old_content = existing.data[0]["content"] if existing.data else ""
    old_id = existing.data[0]["id"] if existing.data else None

    # 2. Run the standard research pipeline (creates a NEW record)
    await research_company(engagement_id)

    # 3. Fetch the new record that research_company just inserted
    new_records = (
        sb.table("research_documents")
        .select("id, content")
        .eq("engagement_id", engagement_id)
        .eq("type", "company_dossier")
        .order("created_at", desc=True)
        .execute()
    )

    if not new_records.data:
        logger.warning(f"Enrich: no new research record found for {engagement_id}")
        return

    new_record = new_records.data[0]
    new_content = new_record["content"]

    # 4. If there was an old record, merge and clean up duplicates
    if old_content and old_id and old_id != new_record["id"]:
        merged = _merge_dossier_sections(old_content, new_content)
        # Update the new record with merged content, delete the old one
        sb.table("research_documents").update({"content": merged}).eq("id", new_record["id"]).execute()
        sb.table("research_documents").delete().eq("id", old_id).execute()

        # Upload merged to storage
        storage_path = f"{engagement_id}/research/company_dossier.md"
        try:
            sb.storage.from_("engagements").update(
                storage_path,
                merged.encode("utf-8"),
                {"content-type": "text/markdown"},
            )
        except Exception:
            try:
                sb.storage.from_("engagements").upload(
                    storage_path,
                    merged.encode("utf-8"),
                    {"content-type": "text/markdown"},
                )
            except Exception as e:
                logger.warning(f"Storage upload for merged dossier failed: {e}")

    # 5. Sync back to pipeline_companies.enrichment_data
    try:
        opp_result = (
            sb.table("pipeline_opportunities")
            .select("company_id")
            .eq("converted_engagement_id", engagement_id)
            .eq("is_deleted", False)
            .execute()
        )
        if opp_result.data:
            co_id = opp_result.data[0]["company_id"]
            co_result = (
                sb.table("pipeline_companies")
                .select("enrichment_data")
                .eq("id", co_id)
                .execute()
            )
            if co_result.data:
                final = new_records.data[0] if not old_content else None
                if not final:
                    final = sb.table("research_documents").select("content").eq("id", new_record["id"]).execute().data[0]
                co_ed = co_result.data[0].get("enrichment_data") or {}
                co_ed["research"] = final["content"]
                sb.table("pipeline_companies").update({"enrichment_data": co_ed}).eq("id", co_id).execute()
    except Exception as e:
        logger.warning(f"Enrich: pipeline sync failed (non-blocking): {e}")

    log_activity(engagement_id, "system", "research_enriched", {
        "had_existing": bool(old_content),
        "merged": bool(old_content),
    })
    logger.info(f"Research enriched for engagement {engagement_id}")


@router.post("/engagements/{engagement_id}/enrich-research")
async def enrich_research(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Run fresh Firecrawl research and merge into existing dossier."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    background_tasks.add_task(_run_async_in_background, _enrich_company_research(engagement_id))
    logger.info(f"Enrich research triggered for engagement {engagement_id}")

    return {"message": "Research enrichment started", "engagement_id": engagement_id}


# Keep old endpoint as alias for backwards compatibility
@router.post("/engagements/{engagement_id}/research/discovery")
async def trigger_discovery_research(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Trigger company research (Firecrawl). Redirects to enrich flow."""
    return await enrich_research(engagement_id, background_tasks, user)


@router.post("/engagements/{engagement_id}/research/interviews")
async def trigger_interview_research(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Trigger interview contact research (Firecrawl). Runs in background."""
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    background_tasks.add_task(_run_async_in_background, research_contacts(engagement_id))
    logger.info(f"Interview research triggered for engagement {engagement_id}")

    return {"message": "Interview research started", "engagement_id": engagement_id}


@router.post("/engagements/{engagement_id}/generate-interview-briefs")
async def generate_interview_briefs(
    engagement_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_partner_auth),
):
    """Generate interview briefs using Phase 1 findings + contact research.

    Returns 202 immediately — brief generation runs as a background task.
    """
    sb = get_supabase()
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Allow from documents_received onward (any phase status or later)
    allowed_statuses = {
        "documents_received", "phase_0", "phase_1", "phase_2", "phase_3",
        "phase_4", "phase_5", "phase_6", "phase_7", "phases_complete",
    }
    if engagement["status"] not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate briefs in status '{engagement['status']}'. "
                   "Engagement must be in 'documents_received' or later.",
        )

    # Fetch Phase 1 preliminary findings memo if available
    phase1_content = None
    try:
        findings_result = (
            sb.table("research_documents")
            .select("content")
            .eq("engagement_id", engagement_id)
            .eq("type", "preliminary_findings_memo")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if findings_result.data:
            phase1_content = findings_result.data[0]["content"]
    except Exception as e:
        logger.warning(f"Could not fetch Phase 1 findings for {engagement_id}: {e}")

    background_tasks.add_task(
        _run_async_in_background,
        research_contacts(engagement_id, phase1_findings=phase1_content),
    )
    logger.info(
        f"Interview brief generation triggered for {engagement_id} "
        f"(phase1_findings={'available' if phase1_content else 'not available'})"
    )

    from starlette.responses import JSONResponse
    return JSONResponse(
        status_code=202,
        content={
            "message": "Interview brief generation started",
            "engagement_id": engagement_id,
            "phase1_findings_available": phase1_content is not None,
        },
    )
