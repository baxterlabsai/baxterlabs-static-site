"""Story Bank, Content Posts, and Content Ideas CRUD endpoints."""

from __future__ import annotations

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase

logger = logging.getLogger("baxterlabs.content")

router = APIRouter(prefix="/api", tags=["content"])

VALID_STORY_CATEGORIES = {
    "Founder Journey", "Operational Observation", "Client Pattern",
    "Industry Data", "Personal Lesson", "Surprising Finding",
}
VALID_POST_TYPES = {"linkedin", "blog"}
VALID_POST_STATUSES = {"idea", "draft", "review", "scheduled", "published", "archived"}
VALID_POST_PLATFORMS = {"linkedin", "blog", "both"}
VALID_IDEA_STATUSES = {"unused", "assigned", "used"}


# ── Pydantic Models ─────────────────────────────────────────────────────

class StoryCreate(BaseModel):
    category: str
    raw_note: str
    hook_draft: Optional[str] = None
    dollar_connection: Optional[str] = None
    slay_outline: Optional[dict] = None
    used_in_post: Optional[bool] = False
    used_in_post_id: Optional[str] = None

class StoryUpdate(BaseModel):
    category: Optional[str] = None
    raw_note: Optional[str] = None
    hook_draft: Optional[str] = None
    dollar_connection: Optional[str] = None
    slay_outline: Optional[dict] = None
    used_in_post: Optional[bool] = None
    used_in_post_id: Optional[str] = None

class PostCreate(BaseModel):
    type: str
    title: str
    body: Optional[str] = None
    status: Optional[str] = "draft"
    platform: Optional[str] = None
    scheduled_date: Optional[str] = None
    published_date: Optional[str] = None
    impressions: Optional[int] = None
    engagement_rate: Optional[float] = None
    comments: Optional[int] = None
    likes: Optional[int] = None
    quality_score: Optional[int] = None
    score_notes: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    blog_slug: Optional[str] = None
    published: Optional[bool] = False
    source_post_id: Optional[str] = None

class PostUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    platform: Optional[str] = None
    scheduled_date: Optional[str] = None
    published_date: Optional[str] = None
    impressions: Optional[int] = None
    engagement_rate: Optional[float] = None
    comments: Optional[int] = None
    likes: Optional[int] = None
    quality_score: Optional[int] = None
    score_notes: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    featured_image_url: Optional[str] = None
    blog_slug: Optional[str] = None
    published: Optional[bool] = None
    source_post_id: Optional[str] = None

class IdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    dollar_hook: Optional[str] = None
    insider_detail: Optional[str] = None
    status: Optional[str] = "unused"
    assigned_week: Optional[str] = None

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    dollar_hook: Optional[str] = None
    insider_detail: Optional[str] = None
    status: Optional[str] = None
    assigned_week: Optional[str] = None


# ==========================================================================
# Story Bank
# ==========================================================================

@router.get("/story-bank")
async def list_stories(
    category: Optional[str] = Query(None),
    used_in_post: Optional[bool] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("story_bank").select("*").order("created_at", desc=True)
    if category:
        if category not in VALID_STORY_CATEGORIES:
            raise HTTPException(400, f"Invalid category: {category}")
        query = query.eq("category", category)
    if used_in_post is not None:
        query = query.eq("used_in_post", used_in_post)
    result = query.execute()
    return result.data


@router.post("/story-bank")
async def create_story(
    payload: StoryCreate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.category not in VALID_STORY_CATEGORIES:
        raise HTTPException(400, f"Invalid category: {payload.category}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("story_bank").insert(data).execute()
    return result.data[0]


@router.put("/story-bank/{story_id}")
async def update_story(
    story_id: str,
    payload: StoryUpdate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.category and payload.category not in VALID_STORY_CATEGORIES:
        raise HTTPException(400, f"Invalid category: {payload.category}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["updated_at"] = datetime.utcnow().isoformat()
    result = sb.table("story_bank").update(data).eq("id", story_id).execute()
    if not result.data:
        raise HTTPException(404, "Story not found")
    return result.data[0]


@router.delete("/story-bank/{story_id}")
async def delete_story(
    story_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = sb.table("story_bank").delete().eq("id", story_id).execute()
    if not result.data:
        raise HTTPException(404, "Story not found")
    return {"ok": True}


# ==========================================================================
# Content Posts
# ==========================================================================

@router.get("/content-posts")
async def list_posts(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("content_posts").select("*").order("created_at", desc=True)
    if type:
        if type not in VALID_POST_TYPES:
            raise HTTPException(400, f"Invalid type: {type}")
        query = query.eq("type", type)
    if status:
        if status not in VALID_POST_STATUSES:
            raise HTTPException(400, f"Invalid status: {status}")
        query = query.eq("status", status)
    if platform:
        if platform not in VALID_POST_PLATFORMS:
            raise HTTPException(400, f"Invalid platform: {platform}")
        query = query.eq("platform", platform)
    result = query.execute()
    return result.data


@router.get("/content-posts/{post_id}")
async def get_post(
    post_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = sb.table("content_posts").select("*").eq("id", post_id).execute()
    if not result.data:
        raise HTTPException(404, "Post not found")
    return result.data[0]


@router.post("/content-posts")
async def create_post(
    payload: PostCreate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.type not in VALID_POST_TYPES:
        raise HTTPException(400, f"Invalid type: {payload.type}")
    if payload.status and payload.status not in VALID_POST_STATUSES:
        raise HTTPException(400, f"Invalid status: {payload.status}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("content_posts").insert(data).execute()
    return result.data[0]


@router.put("/content-posts/{post_id}")
async def update_post(
    post_id: str,
    payload: PostUpdate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.type and payload.type not in VALID_POST_TYPES:
        raise HTTPException(400, f"Invalid type: {payload.type}")
    if payload.status and payload.status not in VALID_POST_STATUSES:
        raise HTTPException(400, f"Invalid status: {payload.status}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    data["updated_at"] = datetime.utcnow().isoformat()
    result = sb.table("content_posts").update(data).eq("id", post_id).execute()
    if not result.data:
        raise HTTPException(404, "Post not found")
    return result.data[0]


@router.delete("/content-posts/{post_id}")
async def delete_post(
    post_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = sb.table("content_posts").delete().eq("id", post_id).execute()
    if not result.data:
        raise HTTPException(404, "Post not found")
    return {"ok": True}


# ==========================================================================
# Content Ideas
# ==========================================================================

@router.get("/content-ideas")
async def list_ideas(
    status: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("content_ideas").select("*").order("created_at", desc=True)
    if status:
        if status not in VALID_IDEA_STATUSES:
            raise HTTPException(400, f"Invalid status: {status}")
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.post("/content-ideas")
async def create_idea(
    payload: IdeaCreate,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("content_ideas").insert(data).execute()
    return result.data[0]


@router.put("/content-ideas/{idea_id}")
async def update_idea(
    idea_id: str,
    payload: IdeaUpdate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.status and payload.status not in VALID_IDEA_STATUSES:
        raise HTTPException(400, f"Invalid status: {payload.status}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("content_ideas").update(data).eq("id", idea_id).execute()
    if not result.data:
        raise HTTPException(404, "Idea not found")
    return result.data[0]


# ==========================================================================
# Public Blog Endpoints (no auth)
# ==========================================================================

@router.get("/public/blog")
async def public_list_blog_posts():
    """Return all published blog posts, newest first."""
    import re
    sb = get_supabase()
    result = (
        sb.table("content_posts")
        .select("id, title, blog_slug, seo_title, seo_description, featured_image_url, published_date, body")
        .eq("type", "blog")
        .eq("published", True)
        .order("published_date", desc=True)
        .execute()
    )
    posts = []
    for row in result.data:
        body = row.get("body") or ""
        # Strip markdown syntax for excerpt
        plain = re.sub(r'[#*_\[\]()>`~]', '', body)
        excerpt = plain[:200].strip()
        posts.append({
            "id": row["id"],
            "title": row["title"],
            "blog_slug": row["blog_slug"],
            "seo_title": row["seo_title"],
            "seo_description": row["seo_description"],
            "featured_image_url": row["featured_image_url"],
            "published_date": row["published_date"],
            "excerpt": excerpt,
        })
    return posts


@router.get("/public/blog/{slug}")
async def public_get_blog_post(slug: str):
    """Return a single published blog post by slug."""
    sb = get_supabase()
    result = (
        sb.table("content_posts")
        .select("id, title, blog_slug, seo_title, seo_description, featured_image_url, published_date, body")
        .eq("type", "blog")
        .eq("published", True)
        .eq("blog_slug", slug)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Blog post not found")
    return result.data[0]
