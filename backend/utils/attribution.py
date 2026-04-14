"""Centralised write-path attribution for multi-user support.

Every `.insert(` call in the backend must go through ``stamp_created_by`` so
that the ``created_by`` column is populated (or explicitly set to ``None``)
on every new row.  The grep gate at ``backend/scripts/verify_attribution.py``
enforces that ``stamp_created_by`` appears in the same function scope as
every ``.insert(`` call.

Contract
--------
* ``user_id`` is the UUID string from the authenticated Supabase JWT
  (``user.get("sub")``).
* Passing ``user_id=None`` is a **deliberate** choice for system, public-form,
  webhook, and background-task contexts where no authenticated user exists.
  Every call site that passes ``None`` must include a brief inline comment
  explaining why (e.g. ``# public intake form, no auth context``).
* The helper **never raises** on ``None`` — the discipline is that every
  insert goes through the helper, and the helper writes whatever the caller
  passed.
* ``assigned_to_user_id`` is accepted as an optional keyword argument.  When
  provided, it is stamped onto the returned dict alongside ``created_by``.
  Phase F will start passing this on task / opportunity creates from the
  frontend; the helper just needs to be ready.
* The input dict is **not mutated**; a shallow copy is returned.
"""
from __future__ import annotations

from typing import Optional


def stamp_created_by(
    payload: dict,
    user_id: Optional[str],
    *,
    assigned_to_user_id: Optional[str] = None,
) -> dict:
    """Return a copy of *payload* with attribution columns stamped.

    Parameters
    ----------
    payload:
        The row dict about to be passed to ``.insert()``.
    user_id:
        Authenticated user UUID, or ``None`` for system / public contexts.
    assigned_to_user_id:
        Optional assignment UUID for tables that support it
        (``pipeline_opportunities``, ``pipeline_tasks``).
    """
    stamped = {**payload, "created_by": user_id}
    if assigned_to_user_id is not None:
        stamped["assigned_to_user_id"] = assigned_to_user_id
    return stamped
