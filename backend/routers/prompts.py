from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id

logger = logging.getLogger("baxterlabs.prompts")

router = APIRouter(prefix="/api", tags=["prompts"])


@router.get("/prompts")
async def list_prompts(user: dict = Depends(verify_partner_auth)):
    """List all active phase prompts. Requires partner auth."""
    sb = get_supabase()
    result = (
        sb.table("phase_prompts")
        .select("phase, name, description, timing, template_text, variables, version")
        .eq("is_active", True)
        .order("phase")
        .execute()
    )
    return {"prompts": result.data, "count": len(result.data)}


def _format_currency(value: Optional[float]) -> str:
    """Format a numeric value as USD currency, e.g. '$12,500.00'."""
    if value is None:
        return "[NOT SET]"
    return f"${value:,.2f}"


def _format_date(value: Optional[str]) -> str:
    """Format an ISO date string as 'Mar 1, 2026'. Returns '[NOT SET]' if None."""
    if not value:
        return "[NOT SET]"
    try:
        dt = datetime.fromisoformat(value)
        return dt.strftime("%b %-d, %Y")
    except (ValueError, TypeError):
        return value


def _format_contacts(contacts: list) -> str:
    """Format interview contacts as a bulleted list."""
    if not contacts:
        return "[NOT SET]"
    lines = []
    for c in contacts:
        name = c.get("name", "Unknown")
        title = c.get("title", "Unknown")
        company = c.get("company", "Unknown")
        email = c.get("email", "Unknown")
        lines.append(f"- {name}, {title} at {company} ({email})")
    return "\n".join(lines)


@router.get("/engagements/{engagement_id}/prompt/{phase_number}")
async def get_rendered_prompt(
    engagement_id: str,
    phase_number: int,
    user: dict = Depends(verify_partner_auth),
):
    """Render a phase prompt with engagement-specific variables. Requires partner auth."""
    sb = get_supabase()

    # Fetch the active prompt for this phase
    prompt_result = (
        sb.table("phase_prompts")
        .select("*")
        .eq("phase", phase_number)
        .eq("is_active", True)
        .execute()
    )
    if not prompt_result.data:
        raise HTTPException(status_code=404, detail=f"No active prompt found for phase {phase_number}")

    prompt = prompt_result.data[0]

    # Fetch engagement with client data
    engagement = get_engagement_by_id(engagement_id)
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    # Fetch interview contacts
    contacts_result = (
        sb.table("interview_contacts")
        .select("*")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    contacts = contacts_result.data or []

    # Build the variable map
    client = engagement.get("clients") or {}

    pain_points = engagement.get("pain_points") or client.get("pain_points") or "[NOT SET]"

    variables_used = {
        "engagement_id": engagement.get("id", "[NOT SET: engagement_id]"),
        "client_name": client.get("primary_contact_name") or "[NOT SET: client_name]",
        "company_name": client.get("company_name") or "[NOT SET: company_name]",
        "fee": _format_currency(engagement.get("fee")),
        "start_date": _format_date(engagement.get("start_date")),
        "end_date": _format_date(engagement.get("target_end_date")),
        "partner_lead": engagement.get("partner_lead") or "[NOT SET: partner_lead]",
        "storage_base": f"engagements/{engagement.get('id', engagement_id)}",
        "interview_contacts": _format_contacts(contacts),
        "pain_points": pain_points,
    }

    # Perform variable injection on the template text
    rendered_text = prompt.get("template_text", "")
    for var_name, var_value in variables_used.items():
        rendered_text = rendered_text.replace("{" + var_name + "}", str(var_value))

    # Replace any remaining unresolved variables with [NOT SET: variable_name]
    unresolved = re.findall(r"\{(\w+)\}", rendered_text)
    for var_name in unresolved:
        rendered_text = rendered_text.replace("{" + var_name + "}", f"[NOT SET: {var_name}]")

    return {
        "phase_number": phase_number,
        "name": prompt.get("name", ""),
        "rendered_text": rendered_text,
        "variables_used": variables_used,
    }
