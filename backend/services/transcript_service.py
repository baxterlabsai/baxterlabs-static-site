"""Transcript intelligence — extraction, LLM analysis, citation tracking."""

from __future__ import annotations

import io
import json
import logging
import os
from typing import Optional

logger = logging.getLogger("baxterlabs.transcript")


# ---------------------------------------------------------------------------
# Content extraction
# ---------------------------------------------------------------------------

def extract_text(content: bytes, extension: str) -> Optional[str]:
    """Extract plain text from transcript file bytes. Returns None on failure."""
    ext = extension.lower()
    try:
        if ext in (".txt", ".md"):
            return content.decode("utf-8", errors="replace")

        if ext == ".pdf":
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n\n".join(pages).strip()
            return text or None

        if ext in (".docx", ".doc"):
            from docx import Document as DocxDocument
            doc = DocxDocument(io.BytesIO(content))
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return text or None

        if ext == ".rtf":
            from striprtf.striprtf import rtf_to_text
            raw = content.decode("utf-8", errors="replace")
            text = rtf_to_text(raw).strip()
            return text or None

    except Exception as e:
        logger.error(f"Text extraction failed for {ext}: {e}")
    return None


# ---------------------------------------------------------------------------
# LLM analysis
# ---------------------------------------------------------------------------

_ANALYSIS_PROMPT = """You are a senior business analyst at BaxterLabs Advisory.
Analyze the following interview transcript from a 14-Day Profit Leak Diagnostic engagement.

Interview with: {contact_name} ({contact_title})
Company: {company_name}

Transcript:
---
{transcript_text}
---

Return a JSON object (no markdown fences) with exactly these keys:
{{
  "summary": "2-3 sentence executive summary of the interview",
  "key_findings": ["finding 1", "finding 2", ...],
  "financial_indicators": ["indicator 1", ...],
  "process_gaps": ["gap 1", ...],
  "notable_quotes": [
    {{"quote": "exact quote from transcript", "context": "brief context for why this matters"}},
    ...
  ]
}}

Focus on:
- Revenue leaks, cost inefficiencies, margin erosion
- Operational bottlenecks and process breakdowns
- Vendor/contract issues mentioned
- Specific dollar amounts, percentages, or financial metrics cited
- Statements that reveal systemic problems vs one-off issues

Extract 3-8 key findings, any financial indicators mentioned, and 2-5 notable direct quotes worth citing in deliverables."""


def analyze_transcript(
    document_id: str,
    engagement_id: str,
    contact_name: str,
    contact_title: Optional[str] = None,
    company_name: Optional[str] = None,
) -> Optional[dict]:
    """Analyze a transcript using Claude and store results in the DB."""
    from services.supabase_client import get_supabase
    import anthropic

    sb = get_supabase()

    # Fetch extracted text
    doc = sb.table("documents").select("extracted_text").eq("id", document_id).execute()
    if not doc.data or not doc.data[0].get("extracted_text"):
        logger.warning(f"No extracted_text for document {document_id}")
        return None

    text = doc.data[0]["extracted_text"]
    # Truncate to ~100k chars to stay within context limits
    if len(text) > 100_000:
        text = text[:100_000] + "\n\n[TRANSCRIPT TRUNCATED]"

    prompt = _ANALYSIS_PROMPT.format(
        contact_name=contact_name,
        contact_title=contact_title or "Unknown",
        company_name=company_name or "Unknown",
        transcript_text=text,
    )

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — skipping transcript analysis")
        return None

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3].strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()

        analysis = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM analysis JSON: {e}\nRaw: {raw[:500]}")
        return None
    except Exception as e:
        logger.error(f"LLM analysis failed for document {document_id}: {e}")
        return None

    # Store analysis_json in documents table
    sb.table("documents").update({
        "analysis_json": analysis,
    }).eq("id", document_id).execute()

    # Update pipeline fold-back summary if applicable
    _update_pipeline_summary(sb, engagement_id, contact_name, analysis.get("summary", ""))

    logger.info(f"Transcript analysis complete — doc={document_id} findings={len(analysis.get('key_findings', []))}")
    return analysis


def _update_pipeline_summary(sb, engagement_id: str, contact_name: str, summary: str) -> None:
    """Update the interview_intelligence summary in pipeline_companies."""
    try:
        opp_result = (
            sb.table("pipeline_opportunities")
            .select("company_id")
            .eq("converted_engagement_id", engagement_id)
            .eq("is_deleted", False)
            .execute()
        )
        if not opp_result.data:
            return

        co_id = opp_result.data[0]["company_id"]
        co_result = (
            sb.table("pipeline_companies")
            .select("id, enrichment_data")
            .eq("id", co_id)
            .execute()
        )
        if not co_result.data:
            return

        co_ed = co_result.data[0].get("enrichment_data") or {}
        intel_list = co_ed.get("interview_intelligence", [])
        for item in intel_list:
            if item.get("contact_name") == contact_name and item.get("engagement_id") == engagement_id:
                item["summary"] = summary
                break

        co_ed["interview_intelligence"] = intel_list
        sb.table("pipeline_companies").update({"enrichment_data": co_ed}).eq("id", co_id).execute()
    except Exception as e:
        logger.warning(f"Pipeline summary update failed (non-blocking): {e}")


# ---------------------------------------------------------------------------
# Citation tracking
# ---------------------------------------------------------------------------

def get_citation_reference(
    contact_name: str,
    contact_title: Optional[str] = None,
    interview_date: Optional[str] = None,
) -> str:
    """Return a formatted citation string in BaxterLabs standard."""
    date_part = ""
    if interview_date:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(interview_date)
            date_part = f", {dt.strftime('%b %-d, %Y')}"
        except (ValueError, TypeError):
            date_part = f", {interview_date}"

    title_part = f", {contact_title}" if contact_title else ""
    return f"[Stated: Interview — {contact_name}{title_part}{date_part}]"


def get_transcript_intelligence(engagement_id: str) -> dict:
    """Return all analyzed transcript data for an engagement."""
    from services.supabase_client import get_supabase

    sb = get_supabase()

    contacts = (
        sb.table("interview_contacts")
        .select("id, name, title, transcript_document_id, updated_at")
        .eq("engagement_id", engagement_id)
        .execute()
    )

    results = []
    for c in contacts.data or []:
        doc_id = c.get("transcript_document_id")
        if not doc_id:
            continue

        doc = (
            sb.table("documents")
            .select("id, analysis_json, extracted_text, uploaded_at")
            .eq("id", doc_id)
            .execute()
        )
        if not doc.data:
            continue

        d = doc.data[0]
        analysis = d.get("analysis_json")
        has_text = bool(d.get("extracted_text"))
        citation = get_citation_reference(
            contact_name=c["name"],
            contact_title=c.get("title"),
            interview_date=d.get("uploaded_at"),
        )

        results.append({
            "contact_id": c["id"],
            "contact_name": c["name"],
            "contact_title": c.get("title"),
            "document_id": doc_id,
            "has_extracted_text": has_text,
            "analysis": analysis,
            "citation": citation,
            "analyzed": analysis is not None,
        })

    return {"contacts": results, "count": len(results)}
