"""Post-engagement follow-up sequence generation and template rendering."""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional, List

from services.supabase_client import get_supabase, log_activity

logger = logging.getLogger("baxterlabs.follow_up")

# ── Email Templates ──────────────────────────────────────────────────────

THIRTY_DAY_SUBJECT = "Checking in — how is implementation going?"

THIRTY_DAY_TEMPLATE = """Hi {contact_name},

It's been about a month since we wrapped up your diagnostic. I wanted to check in and see how things are progressing with the 90-day implementation roadmap.

Specifically, I'm curious:
- Have you been able to get started on the first set of recommendations?
- Any roadblocks coming up that we might be able to help with?

No pressure for a detailed response — even a quick "going well" or "hit a snag with X" would be great to hear.

Best,
{partner_name}"""

SIXTY_DAY_SUBJECT = "{company_name} — quick margin health check"

SIXTY_DAY_TEMPLATE = """Hi {contact_name},

Two months out from the diagnostic — I'd love to do a quick pulse check on a few of the key metrics we identified during our work together.

Could you share a quick read on these three items?
1. {metric_1_from_diagnostic} — trending better, worse, or about the same?
2. {metric_2_from_diagnostic} — any movement here?
3. Overall — do you feel like the operational changes are taking hold?

This takes about 30 seconds and helps me understand how our recommendations are landing in practice. It also helps me calibrate our approach for future clients.

Thanks,
{partner_name}"""

NINETY_DAY_SUBJECT = "Follow-up review opportunity — {company_name}"

NINETY_DAY_TEMPLATE = """Hi {contact_name},

We're now three months past your diagnostic. By now, you've had enough time to implement the initial recommendations and see early results.

I'd like to offer a half-day follow-up review — essentially a focused check-in where we:
- Review progress against the 90-day roadmap
- Identify any recommendations that need adjustment based on real-world results
- Update the profit leak analysis with current numbers to measure actual impact

This is a standalone engagement at $3,500 — not a commitment to ongoing work, just a structured way to make sure the diagnostic investment is paying off.

Would that be useful? Happy to walk through what it would look like on a quick call.

Also — if you know anyone who could benefit from the kind of work we did together, I'd welcome an introduction. Our best clients come from referrals like yours.

Best,
{partner_name}"""


# ── Template Rendering ───────────────────────────────────────────────────

def render_template(template_text: str, variables: dict) -> str:
    """Replace {variable_name} placeholders with actual values."""
    result = template_text
    for key, value in variables.items():
        result = result.replace("{" + key + "}", str(value))
    return result


def build_template_variables(engagement: dict, client: dict) -> dict:
    """Build the variable dict for template rendering."""
    start_date = engagement.get("start_date")
    if start_date:
        try:
            d = date.fromisoformat(str(start_date))
            formatted_date = d.strftime("%B %d, %Y")
        except (ValueError, TypeError):
            formatted_date = str(start_date)
    else:
        formatted_date = "your engagement"

    return {
        "contact_name": client.get("primary_contact_name", "there"),
        "company_name": client.get("company_name", "your company"),
        "partner_name": engagement.get("partner_lead") or "George DeVries",
        "engagement_date": formatted_date,
        "metric_1_from_diagnostic": "[Key metric 1 — edit before sending]",
        "metric_2_from_diagnostic": "[Key metric 2 — edit before sending]",
    }


# ── Sequence Generation ─────────────────────────────────────────────────

def create_follow_up_sequence(engagement: dict, client: dict) -> List[dict]:
    """Create three follow-up records (30/60/90 day) for a closed engagement.

    Returns the list of created records. Skips if records already exist.
    """
    sb = get_supabase()
    engagement_id = engagement["id"]
    client_id = client.get("id") or engagement.get("client_id")

    # Guard: check for existing records
    existing = (
        sb.table("follow_up_sequences")
        .select("id")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if existing.data:
        logger.info(f"Follow-up sequence already exists for engagement {engagement_id} — skipping")
        return existing.data

    today = date.today()

    touchpoints = [
        {
            "touchpoint": "30_day",
            "scheduled_date": (today + timedelta(days=30)).isoformat(),
            "subject_template": THIRTY_DAY_SUBJECT,
            "body_template": THIRTY_DAY_TEMPLATE,
        },
        {
            "touchpoint": "60_day",
            "scheduled_date": (today + timedelta(days=60)).isoformat(),
            "subject_template": SIXTY_DAY_SUBJECT,
            "body_template": SIXTY_DAY_TEMPLATE,
        },
        {
            "touchpoint": "90_day",
            "scheduled_date": (today + timedelta(days=90)).isoformat(),
            "subject_template": NINETY_DAY_SUBJECT,
            "body_template": NINETY_DAY_TEMPLATE,
        },
    ]

    created = []
    for tp in touchpoints:
        row = {
            "engagement_id": engagement_id,
            "client_id": client_id,
            **tp,
        }
        result = sb.table("follow_up_sequences").insert(row).execute()
        if result.data:
            created.append(result.data[0])

    log_activity(engagement_id, "system", "follow_up_sequence_created", {
        "touchpoints": ["30_day", "60_day", "90_day"],
        "message": "Post-engagement follow-up sequence created",
    })

    logger.info(f"Follow-up sequence created for engagement {engagement_id} — {len(created)} touchpoints")
    return created
