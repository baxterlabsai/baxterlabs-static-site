from __future__ import annotations

import os
import logging
from fastapi import Request, HTTPException
import jwt

from services.supabase_client import get_supabase, get_engagement_by_upload_token, get_engagement_by_deliverable_token

logger = logging.getLogger("baxterlabs.auth")


async def verify_partner_auth(request: Request) -> dict:
    """Verify Supabase JWT for partner dashboard routes.

    Uses the Supabase JWT secret to verify tokens. Falls back to
    signature-less decode in dev if no secret is configured.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]

    # Try server-side verification via Supabase Auth API
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        if user_response and user_response.user:
            return {
                "sub": user_response.user.id,
                "email": user_response.user.email,
                "role": "authenticated",
            }
    except Exception as e:
        logger.debug(f"Supabase auth.get_user failed: {e}")

    # Fallback: JWT decode with secret
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
    try:
        if jwt_secret:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
        else:
            payload = jwt.decode(token, options={"verify_signature": False})

        if payload.get("role") != "authenticated":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


async def verify_upload_token(token: str) -> dict:
    """Validate an upload token against the engagements table."""
    engagement = get_engagement_by_upload_token(token)
    if not engagement:
        raise HTTPException(status_code=404, detail="Invalid or expired upload token")
    return engagement


async def verify_deliverable_token(token: str) -> dict:
    """Validate a deliverable token against the engagements table."""
    engagement = get_engagement_by_deliverable_token(token)
    if not engagement:
        raise HTTPException(status_code=404, detail="Invalid or expired deliverable token")
    return engagement
