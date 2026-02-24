from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.clients")

router = APIRouter(prefix="/api", tags=["clients"])


@router.get("/clients")
async def list_clients(
    search: Optional[str] = Query(None, description="Case-insensitive search on company_name or primary_contact_name"),
    user: dict = Depends(verify_partner_auth),
):
    """List all clients with optional search. Includes engagement count per client. Requires partner auth."""
    sb = get_supabase()

    query = sb.table("clients").select(
        "*, engagements(id, status, phase, fee, start_date, target_end_date, created_at)"
    )

    if search:
        query = query.or_(
            f"company_name.ilike.%{search}%,primary_contact_name.ilike.%{search}%"
        )

    result = query.order("created_at", desc=True).execute()

    return {"clients": result.data, "count": len(result.data)}


@router.get("/engagements/calendar")
async def engagements_calendar(user: dict = Depends(verify_partner_auth)):
    """Return non-closed engagements with dates, status, and phase for a Gantt-style calendar view. Requires partner auth."""
    sb = get_supabase()

    result = (
        sb.table("engagements")
        .select("id, status, phase, start_date, target_end_date, fee, partner_lead, clients(company_name)")
        .neq("status", "closed")
        .order("created_at", desc=True)
        .execute()
    )

    return {"engagements": result.data}
