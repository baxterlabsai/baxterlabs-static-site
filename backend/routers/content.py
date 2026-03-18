"""Story Bank, Content Posts, Content Ideas, and Content News CRUD endpoints."""

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
VALID_NEWS_STATUSES = {"unreviewed", "queued", "used", "dismissed"}


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


class NewsUpdate(BaseModel):
    status: Optional[str] = None
    used_in_post_id: Optional[str] = None


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
# Content News
# ==========================================================================

@router.get("/content-news/stats")
async def news_stats(
    user: dict = Depends(verify_partner_auth),
):
    """Return aggregate stats for content news items."""
    sb = get_supabase()
    all_news = sb.table("content_news").select("status, relevance_score, fetched_at").execute()
    rows = all_news.data
    unreviewed = sum(1 for r in rows if r.get("status") == "unreviewed")
    queued = sum(1 for r in rows if r.get("status") == "queued")
    used = sum(1 for r in rows if r.get("status") == "used")
    scores = [r["relevance_score"] for r in rows if r.get("relevance_score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    fetched_dates = [r["fetched_at"] for r in rows if r.get("fetched_at")]
    last_fetched = max(fetched_dates) if fetched_dates else None
    return {
        "unreviewed_count": unreviewed,
        "queued_count": queued,
        "used_count": used,
        "avg_relevance_score": avg_score,
        "last_fetched_at": last_fetched,
    }


@router.get("/content-news")
async def list_news(
    status: Optional[str] = Query(None),
    min_relevance: Optional[int] = Query(None),
    alert_topic: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("content_news").select("*")
    if status:
        if status not in VALID_NEWS_STATUSES:
            raise HTTPException(400, f"Invalid status: {status}")
        query = query.eq("status", status)
    else:
        query = query.neq("status", "dismissed")
    if min_relevance is not None:
        query = query.gte("relevance_score", min_relevance)
    if alert_topic:
        query = query.eq("alert_topic", alert_topic)
    query = query.order("relevance_score", desc=True).order("created_at", desc=True)
    result = query.execute()
    return result.data


@router.put("/content-news/{news_id}")
async def update_news(
    news_id: str,
    payload: NewsUpdate,
    user: dict = Depends(verify_partner_auth),
):
    if payload.status and payload.status not in VALID_NEWS_STATUSES:
        raise HTTPException(400, f"Invalid status: {payload.status}")
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("content_news").update(data).eq("id", news_id).execute()
    if not result.data:
        raise HTTPException(404, "News item not found")
    return result.data[0]


@router.delete("/content-news/{news_id}")
async def delete_news(
    news_id: str,
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    result = sb.table("content_news").delete().eq("id", news_id).execute()
    if not result.data:
        raise HTTPException(404, "News item not found")
    return {"ok": True}


# ==========================================================================
# Content Metrics Rollup
# ==========================================================================

@router.post("/content/metrics-rollup")
async def metrics_rollup(
    user: dict = Depends(verify_partner_auth),
):
    """Recalculate engagement_rate for all published posts with impressions."""
    sb = get_supabase()
    result = (
        sb.table("content_posts")
        .select("id, impressions, likes, comments, engagement_rate")
        .eq("status", "published")
        .gt("impressions", 0)
        .execute()
    )
    posts_updated = 0
    rates: List[float] = []
    top_post = None
    top_rate = -1.0

    for row in result.data:
        impressions = row.get("impressions") or 0
        likes = row.get("likes") or 0
        comments = row.get("comments") or 0
        if impressions <= 0:
            continue
        rate = round(((likes + comments) / impressions) * 100, 2)
        sb.table("content_posts").update({
            "engagement_rate": rate,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", row["id"]).execute()
        posts_updated += 1
        rates.append(rate)
        if rate > top_rate:
            top_rate = rate
            top_post = {"id": row["id"], "title": "", "engagement_rate": rate}

    # Fetch title for top post
    if top_post:
        title_result = sb.table("content_posts").select("title").eq("id", top_post["id"]).execute()
        if title_result.data:
            top_post["title"] = title_result.data[0]["title"]

    avg_rate = round(sum(rates) / len(rates), 2) if rates else 0.0

    return {
        "posts_updated": posts_updated,
        "average_engagement_rate": avg_rate,
        "top_post": top_post,
    }


# ==========================================================================
# Content Performance Summary (for Overview dashboard)
# ==========================================================================

@router.get("/content/performance")
async def content_performance(
    user: dict = Depends(verify_partner_auth),
):
    """Return content performance metrics for the current month."""
    sb = get_supabase()
    now = datetime.utcnow()
    month_start = now.strftime("%Y-%m-01")
    if now.month == 12:
        next_month_start = f"{now.year + 1}-01-01"
    else:
        next_month_start = f"{now.year}-{now.month + 1:02d}-01"

    # Published this month
    pub_result = (
        sb.table("content_posts")
        .select("id, title, engagement_rate, impressions, published_date")
        .eq("status", "published")
        .gte("published_date", month_start)
        .lt("published_date", next_month_start)
        .execute()
    )
    published_this_month = len(pub_result.data)
    total_impressions = sum(r.get("impressions") or 0 for r in pub_result.data)

    # Avg engagement rate (all published with non-null rate)
    all_pub = (
        sb.table("content_posts")
        .select("engagement_rate")
        .eq("status", "published")
        .not_.is_("engagement_rate", "null")
        .execute()
    )
    rates = [r["engagement_rate"] for r in all_pub.data if r.get("engagement_rate") is not None]
    avg_engagement = round(sum(rates) / len(rates), 1) if rates else None

    # Unused stories
    stories_result = (
        sb.table("story_bank")
        .select("id", count="exact")
        .eq("used_in_post", False)
        .execute()
    )
    stories_available = stories_result.count if stories_result.count is not None else len(stories_result.data)

    # Top post this month by engagement_rate
    top_post = None
    month_posts_with_rate = [
        r for r in pub_result.data
        if r.get("engagement_rate") is not None
    ]
    if month_posts_with_rate:
        best = max(month_posts_with_rate, key=lambda r: r["engagement_rate"])
        top_post = {
            "id": best["id"],
            "title": best["title"],
            "engagement_rate": best["engagement_rate"],
            "impressions": best.get("impressions"),
            "published_date": best.get("published_date"),
        }

    return {
        "published_this_month": published_this_month,
        "avg_engagement_rate": avg_engagement,
        "total_impressions": total_impressions if total_impressions > 0 else None,
        "stories_available": stories_available,
        "top_post": top_post,
        "month_label": now.strftime("%B %Y"),
    }


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


# ==========================================================================
# Content Posts (v2 — /api/content/posts)
# ==========================================================================

class ContentPostCreate(BaseModel):
    post_type: Optional[str] = "linkedin"
    title: Optional[str] = None
    body: str
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    voice_notes: Optional[str] = None
    status: Optional[str] = "draft"
    scheduled_for: Optional[str] = None
    engagement_data: Optional[dict] = None
    plugin_version: Optional[str] = None


class ContentPostUpdate(BaseModel):
    body: Optional[str] = None
    status: Optional[str] = None
    scheduled_for: Optional[str] = None


@router.get("/content/posts")
async def list_content_posts(
    status: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List content_posts ordered by created_at DESC, optional ?status= filter."""
    sb = get_supabase()
    query = sb.table("content_posts").select("*").order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data


@router.post("/content/posts")
async def create_content_post(
    payload: ContentPostCreate,
    user: dict = Depends(verify_partner_auth),
):
    """Insert a new content_post row."""
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("content_posts").insert(data).execute()
    return result.data[0]


@router.patch("/content/posts/{post_id}")
async def patch_content_post(
    post_id: str,
    payload: ContentPostUpdate,
    user: dict = Depends(verify_partner_auth),
):
    """Update status, scheduled_for, or body on a content_post."""
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "No fields to update")
    data["updated_at"] = datetime.utcnow().isoformat()
    result = sb.table("content_posts").update(data).eq("id", post_id).execute()
    if not result.data:
        raise HTTPException(404, "Post not found")
    return result.data[0]


# ==========================================================================
# Story Bank (v2 — /api/content/story-bank)
# ==========================================================================

class StoryBankCreate(BaseModel):
    category: str
    finding: str
    engagement_id: Optional[str] = None
    diagnostic_signal: Optional[str] = None
    financial_impact_range: Optional[str] = None
    industry: Optional[str] = None
    firm_size_range: Optional[str] = None


@router.get("/content/story-bank")
async def list_story_bank(
    category: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List story_bank rows ordered by created_at DESC, optional ?category= filter."""
    sb = get_supabase()
    query = sb.table("story_bank").select("*").order("created_at", desc=True)
    if category:
        query = query.eq("category", category)
    result = query.execute()
    return result.data


@router.post("/content/story-bank")
async def create_story_bank_entry(
    payload: StoryBankCreate,
    user: dict = Depends(verify_partner_auth),
):
    """Insert a new story_bank row."""
    sb = get_supabase()
    data = payload.model_dump(exclude_none=True)
    result = sb.table("story_bank").insert(data).execute()
    return result.data[0]


# ==========================================================================
# News Items (v2 — /api/content/news)
# ==========================================================================

@router.get("/content/news")
async def list_news_items(
    candidate: Optional[bool] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    """List news_items ordered by fetched_at DESC, optional ?candidate=true filter."""
    sb = get_supabase()
    query = sb.table("news_items").select("*").order("fetched_at", desc=True)
    if candidate is True:
        query = query.eq("post_candidate", True)
    result = query.execute()
    return result.data


@router.patch("/content/news/{news_id}/flag")
async def flag_news_item(
    news_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Set post_candidate = true on a news_item."""
    sb = get_supabase()
    result = (
        sb.table("news_items")
        .update({"post_candidate": True})
        .eq("id", news_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "News item not found")
    return result.data[0]
