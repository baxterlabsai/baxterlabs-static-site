import os
from fastapi import Request, HTTPException
import jwt

from services.supabase_client import get_engagement_by_upload_token, get_engagement_by_deliverable_token


def _get_jwt_secret() -> str:
    key = os.getenv("SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE", "")
    # The JWT secret for Supabase is the service role key's signing secret.
    # For verification we use the project's JWT secret from Supabase settings.
    # In production, set SUPABASE_JWT_SECRET explicitly. For now, we extract
    # from the service key or use a dedicated env var.
    return os.getenv("SUPABASE_JWT_SECRET", key)


async def verify_partner_auth(request: Request) -> dict:
    """Verify Supabase JWT for partner dashboard routes."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]
    try:
        # Supabase JWTs are signed with the project's JWT secret
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if not jwt_secret:
            # Fallback: accept any valid-looking token structure in dev
            payload = jwt.decode(token, options={"verify_signature": False})
        else:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")

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
