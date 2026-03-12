"""Download files from Supabase templates bucket and populate content columns."""
from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Projects/master.env"))

SUPABASE_URL = os.environ["SUPABASE_URL_BAXTERLABS_STATIC_SITE"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
}

MIME_MAP = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
}

# Templates table rows: storage_path -> template_name (from existing data)
# Plus logos that need to be inserted as new rows
LOGOS = [
    {
        "template_name": "BaxterLabs Logo",
        "phase_folder": "Standards",
        "file_format": "png",
        "storage_path": "Standards/logos/baxterlabs-logo.png",
        "description": "BaxterLabs logo (dark background variant)",
    },
    {
        "template_name": "BaxterLabs Logo White Text",
        "phase_folder": "Standards",
        "file_format": "png",
        "storage_path": "Standards/logos/baxterlabs-logo-white-text.png",
        "description": "BaxterLabs logo with white text",
    },
]


def download_file(client: httpx.Client, path: str) -> bytes:
    url = f"{SUPABASE_URL}/storage/v1/object/templates/{path}"
    resp = client.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.content


def extract_docx_text(content: bytes) -> Optional[str]:
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs) if paragraphs else None


def execute_sql(client: httpx.Client, query: str) -> list:
    """Execute SQL via Supabase's pg REST endpoint (service role)."""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    # Actually, let's use the management API or just the postgrest RPC
    # Simpler: use the raw SQL endpoint via supabase-js pattern
    # We'll write a temp function or use the existing table via REST
    pass


def main() -> None:
    with httpx.Client(timeout=60) as client:
        # Get all existing templates
        url = f"{SUPABASE_URL}/rest/v1/templates?select=id,template_name,storage_path,file_format"
        resp = client.get(url, headers={**HEADERS, "Accept": "application/json"})
        resp.raise_for_status()
        templates = resp.json()
        print(f"Found {len(templates)} existing templates\n")

        # Insert logo rows first
        for logo in LOGOS:
            url = f"{SUPABASE_URL}/rest/v1/templates"
            resp = client.post(url, json=logo, headers={
                **HEADERS,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=representation",
            })
            if resp.status_code in (200, 201):
                data = resp.json()
                if data:
                    templates.append(data[0])
                    print(f"  Inserted logo row: {logo['template_name']}")
            else:
                print(f"  Logo row {logo['template_name']}: {resp.status_code} {resp.text}")

        # Now download and update each template
        for tmpl in templates:
            storage_path = tmpl["storage_path"]
            tid = tmpl["id"]
            name = tmpl["template_name"]
            ext = Path(storage_path).suffix.lower()
            mime_type = MIME_MAP.get(ext, "application/octet-stream")

            print(f"Downloading: {storage_path}")
            content = download_file(client, storage_path)

            # Extract text for .docx
            content_text = None
            if ext == ".docx":
                try:
                    content_text = extract_docx_text(content)
                    if content_text:
                        print(f"  Extracted {len(content_text)} chars of text")
                except Exception as e:
                    print(f"  WARNING: text extraction failed: {e}")

            # Update via PATCH using the REST API
            hex_content = "\\x" + content.hex()
            update_url = f"{SUPABASE_URL}/rest/v1/templates?id=eq.{tid}"
            payload = {
                "mime_type": mime_type,
                "content": hex_content,
                "content_text": content_text,
                "updated_at": "now()",
            }
            resp = client.patch(update_url, json=payload, headers={
                **HEADERS,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            })
            if resp.status_code in (200, 204):
                print(f"  Updated: {name}")
            else:
                print(f"  ERROR updating {name}: {resp.status_code} {resp.text}")

        # Verification
        print("\n--- Verification ---")
        url = f"{SUPABASE_URL}/rest/v1/templates?select=template_name,mime_type,content,content_text&order=template_name"
        resp = client.get(url, headers={**HEADERS, "Accept": "application/json"})
        resp.raise_for_status()
        rows = resp.json()

        print(f"\n{'Name':<45} {'MIME Type':<25} {'Bytes':>10} {'Text Chars':>12}")
        print("-" * 95)
        for row in rows:
            content_str = row.get("content") or ""
            if content_str.startswith("\\x"):
                byte_len = (len(content_str) - 2) // 2
            else:
                byte_len = len(content_str)
            text_len = len(row["content_text"]) if row.get("content_text") else 0
            print(f"{row['template_name']:<45} {row.get('mime_type', 'N/A'):<25} {byte_len:>10} {text_len:>12}")


if __name__ == "__main__":
    main()
