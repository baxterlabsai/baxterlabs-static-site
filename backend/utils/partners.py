from __future__ import annotations

from typing import Optional


def resolve_partner_display_name(supabase, auth_user_id: Optional[str]) -> Optional[str]:
    """Resolve a partner auth_user_id to display_name. Returns None if not found."""
    if not auth_user_id:
        return None
    result = (
        supabase.table("pipeline_partners")
        .select("display_name")
        .eq("auth_user_id", auth_user_id)
        .maybe_single()
        .execute()
    )
    return result.data.get("display_name") if result.data else None
