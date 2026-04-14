"""Research pipeline — Apify (web scraping) + LLM synthesis.

Replaces firecrawl_service.py. Produces narrative intelligence dossiers and
interview briefs grounded in Phase 1 financial findings.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional

from apify_client import ApifyClient

from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.email_service import get_email_service
from utils.attribution import stamp_created_by

logger = logging.getLogger("baxterlabs.research")

# ── Config ────────────────────────────────────────────────────────────────────


def _apify_client() -> ApifyClient:
    key = os.getenv("APIFY_API_KEY", "")
    if not key:
        raise RuntimeError("APIFY_API_KEY not set")
    return ApifyClient(token=key)


def _anthropic_api_key() -> str:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    return key


# ── Data Gathering ────────────────────────────────────────────────────────────


async def fetch_company_intelligence(
    company_name: str,
    website_url: str,
    primary_contact_name: str,
) -> Dict:
    """Gather company data from Apify website crawl and Apify web search.

    Returns {"website_content": "...", "contact_research": "..."}.
    Both sources are run concurrently. Failures are logged and return empty values.
    """

    async def _apify_website_crawl() -> str:
        if not website_url:
            return ""
        try:
            apify = _apify_client()
            run_input = {
                "startUrls": [{"url": website_url if "://" in website_url else f"https://{website_url}"}],
                "maxCrawlPages": 8,
                "maxCrawlDepth": 2,
            }
            run = apify.actor("apify/website-content-crawler").call(run_input=run_input)
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                return ""
            items = list(apify.dataset(dataset_id).iterate_items())
            pages = []
            for item in items:
                text = item.get("text") or item.get("markdown") or ""
                if text.strip():
                    pages.append(text[:3000])
            return "\n\n---\n\n".join(pages)
        except RuntimeError:
            logger.warning("Apify not configured — skipping website crawl")
            return ""
        except Exception as e:
            logger.warning(f"Apify website crawl failed for {website_url}: {e}")
            return ""

    async def _apify_contact_search() -> str:
        try:
            apify = _apify_client()
            query = f'"{primary_contact_name}" "{company_name}" managing partner'
            run_input = {
                "query": query,
                "maxResults": 5,
            }
            run = apify.actor("apify/rag-web-browser").call(run_input=run_input)
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                return ""
            items = list(apify.dataset(dataset_id).iterate_items())
            summaries = []
            for item in items:
                text = item.get("text") or item.get("markdown") or item.get("content") or ""
                if text.strip():
                    summaries.append(text[:2000])
            return "\n\n".join(summaries)
        except RuntimeError:
            logger.warning("Apify not configured — skipping contact search")
            return ""
        except Exception as e:
            logger.warning(f"Apify contact search failed for {primary_contact_name}: {e}")
            return ""

    # Run both concurrently
    website_content, contact_research = await asyncio.gather(
        _apify_website_crawl(),
        _apify_contact_search(),
    )

    return {
        "website_content": website_content,
        "contact_research": contact_research,
    }


async def fetch_contact_intelligence(
    contact_name: str,
    company_name: str,
    title: str,
) -> Dict:
    """Gather data for a single interview contact from Apify web search.

    Returns {"web_research": "..."}.
    """

    async def _apify_web_search() -> str:
        try:
            apify = _apify_client()
            query = f'"{contact_name}" "{company_name}" "{title}"'
            run_input = {
                "query": query,
                "maxResults": 5,
            }
            run = apify.actor("apify/rag-web-browser").call(run_input=run_input)
            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                return ""
            items = list(apify.dataset(dataset_id).iterate_items())
            summaries = []
            for item in items:
                text = item.get("text") or item.get("markdown") or item.get("content") or ""
                if text.strip():
                    summaries.append(text[:2000])
            return "\n\n".join(summaries)
        except RuntimeError:
            logger.warning("Apify not configured — skipping web search")
            return ""
        except Exception as e:
            logger.warning(f"Apify web search failed for {contact_name}: {e}")
            return ""

    web_research = await _apify_web_search()

    return {
        "web_research": web_research,
    }


# ── LLM Synthesis ────────────────────────────────────────────────────────────


async def synthesize_company_dossier(
    raw_intelligence: Dict,
    engagement_context: Dict,
) -> str:
    """Synthesize a narrative company dossier via Claude from raw intelligence data.

    engagement_context should contain: company_name, industry, primary_contact_name, fee.
    """
    import anthropic

    company_name = engagement_context.get("company_name", "Unknown")
    industry = engagement_context.get("industry", "Unknown")
    contact_name = engagement_context.get("primary_contact_name", "Unknown")
    fee = engagement_context.get("fee", 12500)

    website_content = raw_intelligence.get("website_content", "")
    contact_research = raw_intelligence.get("contact_research", "")

    system_prompt = (
        "You are a senior management consultant preparing a pre-discovery intelligence "
        "dossier for a 14-day profit leak diagnostic engagement. Your output will be read "
        "by the consulting partner the morning of their discovery call. Write in clear, "
        "direct prose. Be specific — cite actual figures, signals, and findings from the "
        "data provided. Do not pad with generic industry observations. If data is missing "
        "or unavailable for a section, write \"Insufficient data available\" rather than "
        "speculating."
    )

    user_prompt = f"""Prepare a Pre-Discovery Intelligence Dossier for the following engagement.

**Engagement Context:**
- Company: {company_name}
- Industry: {industry}
- Primary Contact: {contact_name}
- Engagement Fee: ${fee:,.0f}

**Company Website Content (crawled pages):**
{website_content[:8000] if website_content else "No website content available."}

**Primary Contact Web Research:**
{contact_research[:4000] if contact_research else "No contact research available."}

---

Generate the dossier with these sections (use ## headings):

## Company Overview
2-3 sentences: what they do, size, market position — based on website content.

## Financial & Operational Signals
Any signals found in website content or web research: revenue mentions, headcount, growth indicators, job postings, restructuring mentions, cost-related language. Note what is inferred vs. explicitly stated.

## Leadership & Structure
What's known about the leadership team from website and contact research.

## Recent Developments
Last 12 months: press releases, blog posts, news mentions, changes in leadership or offerings.

## Primary Contact Background
Synthesized from web research: career history, public presence, areas of expertise.

## Diagnostic Hypotheses
2-3 specific hypotheses about where profit leaks may exist, grounded in the signals above.

## Recommended Discovery Call Focus
3 specific questions to ask based on the signals."""

    try:
        client = anthropic.Anthropic(api_key=_anthropic_api_key())
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = message.content[0].text

        now = datetime.now(timezone.utc).strftime("%B %d, %Y")
        header = (
            f"# Pre-Discovery Dossier: {company_name}\n"
            f"*Generated {now} · BaxterLabs Advisory*\n\n---\n\n"
        )
        return header + content

    except Exception as e:
        logger.error(f"LLM synthesis failed for company dossier: {e}")
        # Return a structured fallback with raw data
        now = datetime.now(timezone.utc).strftime("%B %d, %Y")
        return (
            f"# Pre-Discovery Dossier: {company_name}\n"
            f"*Generated {now} · BaxterLabs Advisory*\n\n---\n\n"
            f"## Research Notes\n"
            f"LLM synthesis failed: {e}\n\n"
            f"Raw data is available — re-run enrichment to retry synthesis.\n\n"
            f"## Website Content (raw)\n{website_content[:3000] if website_content else 'None'}\n\n"
            f"## Contact Research (raw)\n{contact_research[:2000] if contact_research else 'None'}\n"
        )


async def synthesize_interview_brief(
    contact_intelligence: Dict,
    contact_info: Dict,
    phase1_findings: Optional[str],
    company_context: Dict,
) -> str:
    """Synthesize a narrative interview brief via Claude.

    contact_info: {name, title, company_name}
    phase1_findings: content of preliminary_findings_memo, or None
    company_context: {company_name, industry}
    """
    import anthropic

    contact_name = contact_info.get("name", "Unknown")
    title = contact_info.get("title", "")
    company_name = contact_info.get("company_name", "Unknown")

    web_research = contact_intelligence.get("web_research", "")

    system_prompt = (
        "You are a senior management consultant preparing a targeted interview brief "
        "for a leadership interview during a 14-day profit leak diagnostic. The financial "
        "data has already been analyzed. Your brief should help the interviewer connect "
        "specific financial findings to operational realities through this person's lens. "
        "Every question should be grounded in actual findings from the Phase 1 analysis — "
        "not generic role questions."
    )

    phase1_block = ""
    if phase1_findings:
        phase1_block = f"""**Phase 1 Financial Findings (Preliminary Findings Memo):**
{phase1_findings[:6000]}"""
    else:
        phase1_block = (
            "**Phase 1 Financial Findings:** Not yet available. Generate the best "
            "possible questions from contact research alone."
        )

    user_prompt = f"""Prepare an Interview Brief for the following contact.

**Contact:**
- Name: {contact_name}
- Title: {title}
- Company: {company_name}
- Industry: {company_context.get("industry", "Unknown")}

**Web Research:**
{web_research[:4000] if web_research else "No web research available."}

{phase1_block}

---

Generate the brief with these sections (use ## headings):

## Contact Overview
Name, title, background summary — 3-4 sentences synthesized from research.

## Their Lens on the Business
What aspects of operations/finance this person owns or influences, based on their role and background.

## Phase 1 Findings Relevant to This Interview
Pull the 2-3 findings from Phase 1 analysis most relevant to this person's domain. If Phase 1 findings are not available, note this prominently.

## Curated Interview Questions
5 questions — each one tied to a specific Phase 1 finding, not generic role questions. Format each as: **Finding →** Question. If Phase 1 findings are unavailable, generate research-based questions instead.

## What to Listen For
2-3 things this person might say that would confirm or contradict the diagnostic hypotheses.

## Background Notes
LinkedIn, publications, speaking, tenure — anything that helps build rapport."""

    try:
        client = anthropic.Anthropic(api_key=_anthropic_api_key())
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = message.content[0].text

        now = datetime.now(timezone.utc).strftime("%B %d, %Y")
        header = (
            f"# Interview Brief: {contact_name}\n"
            f"*{title or 'Role Unknown'} · {company_name}*\n"
            f"*Generated {now} · BaxterLabs Advisory*\n\n---\n\n"
        )

        if not phase1_findings:
            header += (
                "> **Note:** Phase 1 analysis not yet available — questions below are "
                "based on contact research only and should be updated after financial review.\n\n"
            )

        return header + content

    except Exception as e:
        logger.error(f"LLM synthesis failed for interview brief ({contact_name}): {e}")
        now = datetime.now(timezone.utc).strftime("%B %d, %Y")
        return (
            f"# Interview Brief: {contact_name}\n"
            f"*{title or 'Role Unknown'} · {company_name}*\n"
            f"*Generated {now} · BaxterLabs Advisory*\n\n---\n\n"
            f"## Research Notes\n"
            f"LLM synthesis failed: {e}\n\n"
            f"Raw web research is available — re-run brief generation to retry.\n\n"
            f"## Web Research (raw)\n{web_research[:3000] if web_research else 'None'}\n"
        )


# ── Orchestrators ─────────────────────────────────────────────────────────────


async def research_company(engagement_id: str) -> None:
    """Run company research for an engagement. Meant to run as a background task.

    Same function signature as firecrawl_service.research_company for drop-in replacement.
    """
    try:
        engagement = get_engagement_by_id(engagement_id)
        if not engagement:
            logger.error(f"research_company: engagement {engagement_id} not found")
            return

        client_data = engagement.get("clients", {})
        company_name = client_data.get("company_name", "Unknown")
        contact_name = client_data.get("primary_contact_name", "Unknown")
        website_url = client_data.get("website_url", "")
        industry = client_data.get("industry", "")
        fee = engagement.get("fee", 12500)

        logger.info(f"Starting company research for {company_name} (engagement {engagement_id})")

        # 1. Gather intelligence from all sources
        raw_intelligence = await fetch_company_intelligence(
            company_name=company_name,
            website_url=website_url,
            primary_contact_name=contact_name,
        )

        # 2. Synthesize dossier via LLM
        engagement_context = {
            "company_name": company_name,
            "industry": industry,
            "primary_contact_name": contact_name,
            "fee": fee,
        }
        dossier_md = await synthesize_company_dossier(raw_intelligence, engagement_context)

        # Track data source failures for Research Notes
        failures = []
        if not raw_intelligence.get("website_content"):
            failures.append("Website crawl returned no content")
        if not raw_intelligence.get("contact_research"):
            failures.append("Contact web search returned no results")

        if failures:
            dossier_md += (
                "\n\n## Research Notes\n"
                + "\n".join(f"- {f}" for f in failures)
                + "\n- Generated by BaxterLabs research pipeline (Apify + Claude)"
            )

        # 3. UPSERT to research_documents table
        sb = get_supabase()
        existing = (
            sb.table("research_documents")
            .select("id")
            .eq("engagement_id", engagement_id)
            .eq("type", "company_dossier")
            .execute()
        )

        if existing.data:
            sb.table("research_documents").update({
                "content": dossier_md,
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            # background research task, no auth context
            sb.table("research_documents").insert(stamp_created_by({
                "engagement_id": engagement_id,
                "type": "company_dossier",
                "content": dossier_md,
            }, None)).execute()

        # 4. Upload to storage
        storage_path = f"{engagement_id}/research/company_dossier.md"
        try:
            sb.storage.from_("engagements").update(
                storage_path,
                dossier_md.encode("utf-8"),
                {"content-type": "text/markdown"},
            )
        except Exception:
            try:
                sb.storage.from_("engagements").upload(
                    storage_path,
                    dossier_md.encode("utf-8"),
                    {"content-type": "text/markdown"},
                )
            except Exception as e:
                logger.warning(f"Storage upload failed for dossier: {e}")

        # 5. Notify partner
        email_svc = get_email_service()
        email_svc.send_research_ready_notification(engagement, "company_dossier")

        # 6. Log activity
        log_activity(engagement_id, "system", "research_company_complete", {
            "sources": {
                "website": bool(raw_intelligence.get("website_content")),
                "contact_search": bool(raw_intelligence.get("contact_research")),
            },
            "failures": failures,
        })

        logger.info(f"Company research complete for {company_name} (engagement {engagement_id})")

    except Exception as e:
        logger.error(f"research_company failed for {engagement_id}: {e}", exc_info=True)
        try:
            log_activity(engagement_id, "system", "research_company_failed", {"error": str(e)})
        except Exception:
            pass


async def research_contacts(engagement_id: str, phase1_findings: Optional[str] = None) -> None:
    """Run interview contact research for an engagement. Meant to run as a background task.

    Updated signature adds optional phase1_findings (preliminary findings memo content).
    If None, briefs note that Phase 1 analysis is not yet available.
    """
    try:
        engagement = get_engagement_by_id(engagement_id)
        if not engagement:
            logger.error(f"research_contacts: engagement {engagement_id} not found")
            return

        client_data = engagement.get("clients", {})
        company_name = client_data.get("company_name", "Unknown")
        industry = client_data.get("industry", "")

        sb = get_supabase()
        contacts_result = (
            sb.table("interview_contacts")
            .select("*")
            .eq("engagement_id", engagement_id)
            .order("contact_number")
            .execute()
        )

        contacts = contacts_result.data or []
        if not contacts:
            logger.info(f"No interview contacts for engagement {engagement_id}")
            return

        logger.info(f"Starting interview research for {len(contacts)} contacts ({company_name})")

        company_context = {
            "company_name": company_name,
            "industry": industry,
        }

        for contact in contacts:
            contact_name = contact.get("name", "Unknown")
            title = contact.get("title", "")
            contact_number = contact.get("contact_number", 0)

            # 1. Gather intelligence
            contact_intelligence = await fetch_contact_intelligence(
                contact_name=contact_name,
                company_name=company_name,
                title=title,
            )

            # 2. Synthesize brief via LLM
            contact_info = {
                "name": contact_name,
                "title": title,
                "company_name": company_name,
            }
            brief_md = await synthesize_interview_brief(
                contact_intelligence=contact_intelligence,
                contact_info=contact_info,
                phase1_findings=phase1_findings,
                company_context=company_context,
            )

            # 3. INSERT to research_documents — background research task, no auth context
            sb.table("research_documents").insert(stamp_created_by({
                "engagement_id": engagement_id,
                "type": "interview_brief",
                "content": brief_md,
                "contact_name": contact_name,
            }, None)).execute()

            # 4. Upload to storage
            storage_path = f"{engagement_id}/research/interview_brief_{contact_number}.md"
            try:
                sb.storage.from_("engagements").upload(
                    storage_path,
                    brief_md.encode("utf-8"),
                    {"content-type": "text/markdown"},
                )
            except Exception as e:
                logger.warning(f"Storage upload failed for brief {contact_number}: {e}")

            # Rate limit between contacts
            await asyncio.sleep(2)

        # Notify partner
        email_svc = get_email_service()
        email_svc.send_research_ready_notification(engagement, "interview_briefs")

        # Log activity
        log_activity(engagement_id, "system", "research_contacts_complete", {
            "contacts_researched": len(contacts),
            "phase1_findings_available": phase1_findings is not None,
        })

        logger.info(
            f"Interview research complete for {company_name} — "
            f"{len(contacts)} briefs generated"
        )

    except Exception as e:
        logger.error(f"research_contacts failed for {engagement_id}: {e}", exc_info=True)
        try:
            log_activity(engagement_id, "system", "research_contacts_failed", {"error": str(e)})
        except Exception:
            pass
