"""Firecrawl research integration — company dossier + interview briefs.

Uses raw httpx calls to the Firecrawl REST API (same approach as VoiceAudit Pro).
API versions: v1 for crawl, v2 for search and scrape.
"""

from __future__ import annotations

import os
import asyncio
import logging
from typing import Optional, List, Dict
from datetime import datetime, timezone

import httpx

from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.email_service import get_email_service

logger = logging.getLogger("baxterlabs.firecrawl")

FIRECRAWL_BASE_URL = "https://api.firecrawl.dev"
CRAWL_ENDPOINT = "/v1/crawl"
STATUS_ENDPOINT = "/v1/crawl/{crawl_id}"
SEARCH_ENDPOINT = "/v1/search"
SCRAPE_ENDPOINT = "/v1/scrape"


def _get_api_key() -> str:
    key = os.getenv("FIRECRAWL_API_KEY", "")
    if not key:
        raise RuntimeError("FIRECRAWL_API_KEY not set")
    return key


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json",
    }


# ── Firecrawl API Wrappers ──────────────────────────────────────


async def _crawl_website(url: str, limit: int = 10) -> List[Dict]:
    """Crawl a website using Firecrawl v1 crawl endpoint. Returns list of page results."""
    payload = {
        "url": url,
        "limit": limit,
        "maxDepth": 2,
        "scrapeOptions": {
            "formats": ["markdown"],
            "onlyMainContent": True,
            "excludeTags": ["nav", "footer", "script", "style", "aside", "form"],
        },
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        # Initiate crawl
        for attempt in range(3):
            try:
                resp = await client.post(
                    f"{FIRECRAWL_BASE_URL}{CRAWL_ENDPOINT}",
                    headers=_headers(),
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                break
            except (httpx.ReadTimeout, httpx.ConnectError) as e:
                delay = [5, 10, 15][min(attempt, 2)]
                logger.warning(f"Crawl initiation attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
        else:
            logger.error(f"Failed to initiate crawl for {url} after 3 attempts")
            return []

        if not data.get("success"):
            crawl_id = data.get("id")
            if not crawl_id:
                logger.error(f"Crawl failed for {url}: {data}")
                return []
        else:
            crawl_id = data.get("id")

        if not crawl_id:
            logger.error(f"No crawl_id returned for {url}")
            return []

        logger.info(f"Crawl initiated for {url} — crawl_id={crawl_id}")

        # Poll for completion
        status_url = f"{FIRECRAWL_BASE_URL}{STATUS_ENDPOINT.format(crawl_id=crawl_id)}"
        for poll in range(90):  # 15 minutes max at 10s intervals
            await asyncio.sleep(10)
            try:
                resp = await client.get(status_url, headers=_headers())
                resp.raise_for_status()
                status_data = resp.json()
            except Exception as e:
                logger.warning(f"Poll {poll + 1} failed: {e}")
                continue

            status = status_data.get("status", "")
            if status == "completed":
                pages = status_data.get("data", [])
                logger.info(f"Crawl complete for {url} — {len(pages)} pages")
                return pages
            elif status == "failed":
                logger.error(f"Crawl failed for {url}: {status_data}")
                return []

    return []


async def _search_web(query: str, limit: int = 5) -> List[Dict]:
    """Search the web using Firecrawl v1 search endpoint."""
    payload = {
        "query": query,
        "limit": limit,
        "scrapeOptions": {
            "formats": ["markdown"],
            "onlyMainContent": True,
        },
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    f"{FIRECRAWL_BASE_URL}{SEARCH_ENDPOINT}",
                    headers=_headers(),
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

                # v1 response format
                results = data.get("data", [])
                if isinstance(results, list):
                    logger.info(f"Search returned {len(results)} results for: {query}")
                    return results

                return []
            except httpx.HTTPStatusError as e:
                logger.error(f"Search HTTP error for '{query}': {e.response.status_code}")
                return []
            except (httpx.ReadTimeout, httpx.ConnectError) as e:
                delay = 30 * (2 ** attempt)
                logger.warning(f"Search attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)

    return []


async def _scrape_page(url: str) -> Optional[Dict]:
    """Scrape a single page using Firecrawl v1 scrape endpoint."""
    payload = {
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": True,
        "waitFor": 2000,
        "timeout": 45000,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(2):
            try:
                resp = await client.post(
                    f"{FIRECRAWL_BASE_URL}{SCRAPE_ENDPOINT}",
                    headers=_headers(),
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                if data.get("success"):
                    return data.get("data", {})
                return None
            except Exception as e:
                logger.warning(f"Scrape attempt {attempt + 1} for {url}: {e}")
                await asyncio.sleep(2 * (attempt + 1))

    return None


# ── Research Methods ─────────────────────────────────────────────


def _extract_section(pages: List[Dict], keywords: List[str]) -> str:
    """Extract content from crawled pages matching keywords in URL or title."""
    matches = []
    for page in pages:
        url = (page.get("url") or page.get("metadata", {}).get("sourceURL", "")).lower()
        title = (page.get("title") or page.get("metadata", {}).get("title", "")).lower()
        content = page.get("markdown", "")

        for kw in keywords:
            if kw in url or kw in title:
                if content and len(content.strip()) > 50:
                    matches.append(content[:3000])
                break

    return "\n\n".join(matches) if matches else ""


def _build_dossier(
    company_name: str,
    contact_name: str,
    pages: List[Dict],
    contact_results: List[Dict],
    source_urls: List[str],
) -> str:
    """Assemble the Pre-Discovery Dossier markdown."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y")

    # Extract sections from crawled pages
    homepage_content = pages[0].get("markdown", "")[:2000] if pages else "No website data available."

    about_content = _extract_section(pages, ["about", "company", "who-we-are", "our-story"])
    team_content = _extract_section(pages, ["team", "leadership", "people", "staff", "management"])
    services_content = _extract_section(pages, ["service", "product", "solution", "what-we-do", "offering"])
    news_content = _extract_section(pages, ["news", "press", "blog", "article", "update", "announcement"])
    careers_content = _extract_section(pages, ["career", "job", "hiring", "join", "work-with-us"])

    # Contact search results
    contact_info = ""
    linkedin_urls = []
    for result in contact_results:
        url = result.get("url") or result.get("metadata", {}).get("sourceURL", "")
        content = result.get("markdown", "")
        if "linkedin.com" in url.lower():
            linkedin_urls.append(url)
        if content:
            contact_info += content[:1500] + "\n\n"

    dossier = f"""# Pre-Discovery Dossier: {company_name}
*Generated {now} · BaxterLabs Advisory*

---

## Company Overview
{about_content or homepage_content[:2000] or "No public company overview found."}

## Leadership Team
{team_content or "No leadership information found on company website."}

## Services / Products
{services_content or "No services/products information found on company website."}

## Recent News & Growth Signals
{news_content or "No recent news found."}
{f"**Hiring signals:** Careers page found — may indicate growth." if careers_content else ""}

## Primary Contact Background
**{contact_name}**

{contact_info.strip() or "No public information found for this contact."}

## LinkedIn URLs Discovered
{chr(10).join(f"- {url}" for url in linkedin_urls) if linkedin_urls else "No LinkedIn profiles found."}

## Source URLs
{chr(10).join(f"- {url}" for url in source_urls[:15])}

## Research Notes
- Website pages crawled: {len(pages)}
- Contact search results: {len(contact_results)}
- Generated automatically by BaxterLabs research pipeline
"""
    return dossier


def _build_interview_brief(
    contact_name: str,
    title: str,
    company_name: str,
    search_results: List[Dict],
) -> str:
    """Assemble an Interview Brief for one contact."""
    now = datetime.now(timezone.utc).strftime("%B %d, %Y")

    background = ""
    linkedin_urls = []
    web_urls = []

    for result in search_results:
        url = result.get("url") or result.get("metadata", {}).get("sourceURL", "")
        content = result.get("markdown", "")
        if "linkedin.com" in url.lower():
            linkedin_urls.append(url)
        else:
            web_urls.append(url)
        if content:
            background += content[:1500] + "\n\n"

    # Role-based questions based on title
    role_lower = (title or "").lower()
    if any(k in role_lower for k in ["cfo", "finance", "controller", "accounting", "treasurer"]):
        questions = [
            "What does your current close process look like, and where do you see the most time spent?",
            "How do you track and approve vendor spend — is there a formal procurement process?",
            "What financial metrics do you report to leadership, and which ones concern you most?",
            "Have you identified any areas where costs have crept up without a clear driver?",
            "How confident are you in your current revenue recognition and billing accuracy?",
        ]
    elif any(k in role_lower for k in ["coo", "operation", "ops", "vp op", "director op"]):
        questions = [
            "Walk me through your core operational workflow — where are the biggest bottlenecks?",
            "How do you measure operational efficiency today? What KPIs matter most?",
            "Where do you see the most rework, delays, or manual workarounds?",
            "How well do your current tools and systems support your team's workflow?",
            "If you could fix one operational issue tomorrow, what would it be?",
        ]
    elif any(k in role_lower for k in ["ceo", "president", "founder", "owner", "managing"]):
        questions = [
            "What's your biggest concern about the business right now — growth, margin, or something else?",
            "Where do you feel the company is leaving money on the table?",
            "How would you describe the gap between where you are and where you want to be in 12 months?",
            "What's worked well in past attempts to improve profitability or efficiency?",
            "Are there areas of the business you feel you don't have enough visibility into?",
        ]
    elif any(k in role_lower for k in ["sale", "revenue", "commercial", "business dev"]):
        questions = [
            "How do you currently price your products/services, and when was pricing last reviewed?",
            "What does your sales pipeline look like, and where do deals stall or fall through?",
            "How do you track customer profitability — do some accounts cost more to serve than they generate?",
            "What's your customer retention rate, and what drives churn?",
            "Are there revenue streams or markets you've considered but haven't pursued?",
        ]
    else:
        questions = [
            f"As {title}, what does a typical week look like for you and your team?",
            "What are the biggest challenges your department faces right now?",
            "Where do you see inefficiencies or wasted effort in your current processes?",
            "How well do your tools and systems support what you need to accomplish?",
            "If you had unlimited budget for one improvement, what would it be?",
        ]

    brief = f"""# Interview Brief: {contact_name}
*{title or "Role Unknown"} · {company_name}*
*Generated {now} · BaxterLabs Advisory*

---

## Professional Background
{background.strip() or "No public professional information found for this contact."}

## Role & Likely Perspective
Based on their role as **{title or "team member"}**, this person likely has direct visibility into:
{_role_perspective(role_lower)}

## Suggested Interview Questions
{chr(10).join(f"- {q}" for q in questions)}

## LinkedIn / Web Presence
{chr(10).join(f"- {url}" for url in linkedin_urls) if linkedin_urls else "No LinkedIn profile found."}
{chr(10).join(f"- {url}" for url in web_urls[:5]) if web_urls else ""}

## Research Notes
- Web search results found: {len(search_results)}
- Generated automatically by BaxterLabs research pipeline
"""
    return brief


def _role_perspective(role_lower: str) -> str:
    if any(k in role_lower for k in ["cfo", "finance", "controller"]):
        return "- Financial performance and reporting\n- Cost structure and vendor relationships\n- Cash flow management and working capital\n- Budget variance and forecasting accuracy"
    elif any(k in role_lower for k in ["coo", "operation", "ops"]):
        return "- Operational workflows and process efficiency\n- Resource allocation and capacity utilization\n- Technology and systems effectiveness\n- Cross-department coordination challenges"
    elif any(k in role_lower for k in ["ceo", "president", "founder", "owner"]):
        return "- Overall business strategy and growth trajectory\n- Market positioning and competitive landscape\n- Organizational structure and leadership gaps\n- Capital allocation and investment priorities"
    elif any(k in role_lower for k in ["sale", "revenue", "commercial"]):
        return "- Revenue generation and pipeline health\n- Pricing strategy and customer profitability\n- Customer acquisition costs and retention\n- Market opportunities and competitive dynamics"
    elif any(k in role_lower for k in ["hr", "people", "talent"]):
        return "- Workforce planning and compensation benchmarks\n- Employee retention and satisfaction\n- Organizational structure and role clarity\n- Training, development, and productivity"
    else:
        return "- Day-to-day departmental operations\n- Process bottlenecks and manual workarounds\n- Tool and system effectiveness\n- Resource constraints and priorities"


# ── Public Research Functions ────────────────────────────────────


async def research_company(engagement_id: str) -> None:
    """Run company research for an engagement. Meant to run as a background task."""
    try:
        engagement = get_engagement_by_id(engagement_id)
        if not engagement:
            logger.error(f"research_company: engagement {engagement_id} not found")
            return

        client = engagement.get("clients", {})
        company_name = client.get("company_name", "Unknown")
        contact_name = client.get("primary_contact_name", "Unknown")
        website_url = client.get("website_url", "")

        logger.info(f"Starting company research for {company_name} (engagement {engagement_id})")

        source_urls = []
        pages = []
        contact_results = []

        # 1. Crawl company website
        if website_url:
            try:
                pages = await _crawl_website(website_url, limit=10)
                source_urls.extend(
                    p.get("url") or p.get("metadata", {}).get("sourceURL", "")
                    for p in pages if p.get("url") or p.get("metadata", {}).get("sourceURL")
                )
            except Exception as e:
                logger.warning(f"Website crawl failed for {website_url}: {e}")

        # 2. Search for primary contact
        try:
            contact_results = await _search_web(f"{contact_name} {company_name}", limit=5)
            source_urls.extend(
                r.get("url") or r.get("metadata", {}).get("sourceURL", "")
                for r in contact_results if r.get("url") or r.get("metadata", {}).get("sourceURL")
            )
        except Exception as e:
            logger.warning(f"Contact search failed for {contact_name}: {e}")

        # 3. Assemble dossier
        dossier_md = _build_dossier(company_name, contact_name, pages, contact_results, source_urls)

        # 4. Store in research_documents table
        sb = get_supabase()
        sb.table("research_documents").insert({
            "engagement_id": engagement_id,
            "type": "company_dossier",
            "content": dossier_md,
            "source_urls": source_urls[:20],
        }).execute()

        # 5. Upload to storage
        storage_path = f"{engagement_id}/research/company_dossier.md"
        try:
            sb.storage.from_("engagements").upload(
                storage_path,
                dossier_md.encode("utf-8"),
                {"content-type": "text/markdown"},
            )
        except Exception as e:
            logger.warning(f"Storage upload failed for dossier: {e}")

        # 6. Notify partner
        email_svc = get_email_service()
        email_svc.send_research_ready_notification(engagement, "company_dossier")

        # 7. Log activity
        log_activity(engagement_id, "system", "research_company_complete", {
            "pages_crawled": len(pages),
            "contact_results": len(contact_results),
            "source_count": len(source_urls),
        })

        logger.info(f"Company research complete for {company_name} — {len(pages)} pages, {len(contact_results)} contact results")

    except Exception as e:
        logger.error(f"research_company failed for {engagement_id}: {e}", exc_info=True)
        try:
            log_activity(engagement_id, "system", "research_company_failed", {"error": str(e)})
        except Exception:
            pass


async def research_contacts(engagement_id: str) -> None:
    """Run interview contact research for an engagement. Meant to run as a background task."""
    try:
        engagement = get_engagement_by_id(engagement_id)
        if not engagement:
            logger.error(f"research_contacts: engagement {engagement_id} not found")
            return

        client = engagement.get("clients", {})
        company_name = client.get("company_name", "Unknown")

        sb = get_supabase()
        contacts_result = sb.table("interview_contacts").select("*").eq(
            "engagement_id", engagement_id
        ).order("contact_number").execute()

        contacts = contacts_result.data or []
        if not contacts:
            logger.info(f"No interview contacts for engagement {engagement_id}")
            return

        logger.info(f"Starting interview research for {len(contacts)} contacts ({company_name})")

        for contact in contacts:
            contact_name = contact.get("name", "Unknown")
            title = contact.get("title", "")
            contact_number = contact.get("contact_number", 0)

            # Search for contact
            search_results = []
            try:
                query = f"{contact_name} {company_name}"
                if title:
                    query += f" {title}"
                search_results = await _search_web(query, limit=5)
            except Exception as e:
                logger.warning(f"Search failed for contact {contact_name}: {e}")

            # Build brief
            brief_md = _build_interview_brief(contact_name, title, company_name, search_results)

            # Store in research_documents
            sb.table("research_documents").insert({
                "engagement_id": engagement_id,
                "type": "interview_brief",
                "content": brief_md,
                "contact_name": contact_name,
                "source_urls": [
                    r.get("url") or r.get("metadata", {}).get("sourceURL", "")
                    for r in search_results
                    if r.get("url") or r.get("metadata", {}).get("sourceURL")
                ],
            }).execute()

            # Upload to storage
            storage_path = f"{engagement_id}/research/interview_brief_{contact_number}.md"
            try:
                sb.storage.from_("engagements").upload(
                    storage_path,
                    brief_md.encode("utf-8"),
                    {"content-type": "text/markdown"},
                )
            except Exception as e:
                logger.warning(f"Storage upload failed for brief {contact_number}: {e}")

            # Small delay between searches to avoid rate limits
            await asyncio.sleep(2)

        # Notify partner
        email_svc = get_email_service()
        email_svc.send_research_ready_notification(engagement, "interview_briefs")

        # Log activity
        log_activity(engagement_id, "system", "research_contacts_complete", {
            "contacts_researched": len(contacts),
        })

        logger.info(f"Interview research complete for {company_name} — {len(contacts)} briefs generated")

    except Exception as e:
        logger.error(f"research_contacts failed for {engagement_id}: {e}", exc_info=True)
        try:
            log_activity(engagement_id, "system", "research_contacts_failed", {"error": str(e)})
        except Exception:
            pass
