from __future__ import annotations

import re
import logging
import secrets
from typing import List, Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, log_activity
from services.email_service import get_email_service, EMAIL_INFO

logger = logging.getLogger("baxterlabs.users")

router = APIRouter(prefix="/api", tags=["users"])

# Brand colours (matching services/email_service.py)
CRIMSON = "#66151C"
TEAL = "#005454"
GOLD = "#C9A84C"

VALID_ROLES = ("partner", "admin")

# Simple email regex — intentionally permissive; real validation happens via
# Supabase when the user is actually created.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class InviteUserRequest(BaseModel):
    email: str
    full_name: str
    role: str = "partner"


class InviteUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str


class UserItem(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: str
    last_sign_in_at: Optional[str] = None


class DeleteUserResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# POST /api/users/invite
# ---------------------------------------------------------------------------


@router.post("/users/invite", response_model=InviteUserResponse)
async def invite_user(
    body: InviteUserRequest,
    user: dict = Depends(verify_partner_auth),
):
    """Invite a new partner/admin user to the platform."""

    email = body.email.strip().lower()
    full_name = body.full_name.strip()
    role = body.role.strip().lower()

    # --- Validation ----------------------------------------------------------
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}",
        )

    if not full_name:
        raise HTTPException(status_code=400, detail="full_name is required")

    # --- Create user via Supabase Admin API ----------------------------------
    temp_password = secrets.token_urlsafe(12)

    try:
        sb = get_supabase()
        result = sb.auth.admin.create_user(
            {
                "email": email,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "role": role,
                },
            }
        )
    except Exception as exc:
        logger.error("Failed to create user %s: %s", email, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create user: {exc}",
        )

    user_id = str(result.user.id)

    # --- Send welcome email --------------------------------------------------
    try:
        email_svc = get_email_service()
        html_body = f"""
        <h2 style="color:{CRIMSON};font-family:Georgia,serif;margin-top:0;">
            Welcome to BaxterLabs Advisory
        </h2>
        <p>Hello {full_name},</p>
        <p>
            You have been invited to join the
            <strong>BaxterLabs Advisory Platform</strong> as a
            <strong>{role}</strong>.
        </p>
        <p>Your temporary credentials are:</p>
        <table style="border-collapse:collapse;margin:16px 0;">
            <tr>
                <td style="padding:8px 16px;font-weight:600;color:{TEAL};">Email</td>
                <td style="padding:8px 16px;">{email}</td>
            </tr>
            <tr>
                <td style="padding:8px 16px;font-weight:600;color:{TEAL};">Temporary Password</td>
                <td style="padding:8px 16px;font-family:monospace;background:#f0f0f0;border-radius:4px;">
                    {temp_password}
                </td>
            </tr>
        </table>
        <p>
            <a href="https://baxterlabs.ai/dashboard"
               style="display:inline-block;padding:12px 24px;background-color:{CRIMSON};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">
                Go to Dashboard
            </a>
        </p>
        <p style="color:{TEAL};font-weight:600;margin-top:24px;">
            Please change your password immediately after your first login.
        </p>
        """
        email_svc._send_email(
            email, "Welcome to BaxterLabs Advisory", html_body,
            from_email=EMAIL_INFO, from_name="BaxterLabs",
        )
    except Exception as exc:
        # Non-fatal — user was still created successfully.
        logger.warning("Failed to send welcome email to %s: %s", email, exc)

    # --- Log activity --------------------------------------------------------
    try:
        log_activity(
            None,
            user.get("email", "unknown"),
            "user_invited",
            {"invited_email": email, "role": role},
        )
    except Exception as exc:
        logger.warning("Failed to log invite activity for %s: %s", email, exc)

    return InviteUserResponse(
        id=user_id,
        email=email,
        full_name=full_name,
        role=role,
    )


# ---------------------------------------------------------------------------
# GET /api/users
# ---------------------------------------------------------------------------


@router.get("/users", response_model=List[UserItem])
async def list_users(user: dict = Depends(verify_partner_auth)):
    """List all platform users (partners and admins)."""

    try:
        sb = get_supabase()
        result = sb.auth.admin.list_users()
    except Exception as exc:
        logger.error("Failed to list users: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to list users: {exc}")

    users: List[UserItem] = []
    for u in result:
        metadata = getattr(u, "user_metadata", {}) or {}
        users.append(
            UserItem(
                id=str(u.id),
                email=u.email,
                full_name=metadata.get("full_name", ""),
                role=metadata.get("role", "partner"),
                created_at=str(u.created_at),
                last_sign_in_at=str(u.last_sign_in_at) if u.last_sign_in_at else None,
            )
        )

    return users


# ---------------------------------------------------------------------------
# DELETE /api/users/{user_id}
# ---------------------------------------------------------------------------


@router.delete("/users/{user_id}", response_model=DeleteUserResponse)
async def delete_user(
    user_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Remove a user from the platform. Cannot remove yourself."""

    # Prevent self-deletion
    if user_id == user.get("sub"):
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    try:
        sb = get_supabase()
        sb.auth.admin.delete_user(user_id)
    except Exception as exc:
        logger.error("Failed to delete user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {exc}")

    # Log activity
    try:
        log_activity(
            None,
            user.get("email", "unknown"),
            "user_deleted",
            {"deleted_user_id": user_id},
        )
    except Exception as exc:
        logger.warning("Failed to log delete activity for user %s: %s", user_id, exc)

    return DeleteUserResponse(message="User removed successfully")
