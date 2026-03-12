from __future__ import annotations

import io
import logging
from typing import Dict

from fastapi import HTTPException
from docx import Document

from services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Simple in-memory cache: path -> extracted text
_cache: Dict[str, str] = {}


def get_template_text(bucket: str, path: str) -> str:
    """Download a file from Supabase Storage and return its text content."""
    if path in _cache:
        return _cache[path]

    sb = get_supabase()
    try:
        data = sb.storage.from_(bucket).download(path)
    except Exception as exc:
        logger.warning("Template download failed: %s/%s — %s", bucket, path, exc)
        raise HTTPException(status_code=404, detail=f"Template not found: {path}")

    if path.endswith(".docx"):
        doc = Document(io.BytesIO(data))
        text = "\n".join(p.text for p in doc.paragraphs)
    elif path.endswith((".md", ".txt")):
        text = data.decode("utf-8")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {path}")

    _cache[path] = text
    return text
