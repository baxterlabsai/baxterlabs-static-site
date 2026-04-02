"""Parse Phase 5 deliverable markdown into structured placeholder maps.

Phase 5 produces markdown files with sections tagged to match the docx/pptx
template placeholders.  This module extracts those sections so the document
renderer can find and replace the correct placeholders.

Expected markdown conventions
-----------------------------
YAML frontmatter (optional):
    ---
    deliverable: executive_summary
    client: Acme Corp
    date: March 2026
    ---

Section headings map directly to template placeholders:
    ## [SECTION 1: PURPOSE]
    Body text goes here...

    ## [CHART: profit_leak_donut]

    ## [FINDING 1 TITLE]: Understaffed Billing
    ## [FINDING 1]
    Body text for finding 1...

    ## [TABLE: leak_summary]
    | # | Leak | Amount |
    |---|------|--------|
    | 1 | ...  | $xxx   |

Slide-structured markdown (for Presentation Deck):
    # Slide 1: Title Slide
    ## Slide Body
    Content for the slide face
    ## Slide Narration
    Content for speaker notes
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple


def parse_frontmatter(content: str) -> Tuple[Dict[str, str], str]:
    """Extract YAML-style frontmatter and return (metadata, remaining body).

    Returns empty dict if no frontmatter is found.
    """
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    fm_block = content[3:end].strip()
    body = content[end + 3:].strip()

    meta: Dict[str, str] = {}
    for line in fm_block.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()

    return meta, body


def parse_deliverable_markdown(content: str) -> Dict[str, str]:
    """Parse a deliverable .md file into a dict of placeholder_key -> content.

    Keys are the text inside the ``[BRACKETS]`` in section headings, e.g.:
    - ``"SECTION 1: PURPOSE"`` -> paragraph text
    - ``"CHART: profit_leak_donut"`` -> ``""`` (presence flag)
    - ``"FINDING 1 TITLE"`` -> ``"Understaffed Billing"``
    - ``"FINDING 1"`` -> body paragraph text
    - ``"TABLE: leak_summary"`` -> markdown table text
    - ``"ENDNOTES"`` -> full endnotes text
    - ``"CLIENT COMPANY NAME"`` -> from frontmatter
    - ``"ENGAGEMENT DATE"`` -> from frontmatter

    The renderer uses these keys to find and replace matching ``[KEY]``
    placeholders in the template documents.
    """
    meta, body = parse_frontmatter(content)

    sections: Dict[str, str] = {}

    # Inject frontmatter values as top-level keys
    if meta.get("client"):
        sections["CLIENT COMPANY NAME"] = meta["client"]
    if meta.get("date"):
        sections["ENGAGEMENT DATE"] = meta["date"]

    # Pattern: ## [KEY] or ## [KEY]: Extra Text
    heading_re = re.compile(r"^#{1,3}\s+\[([^\]]+)\](?:\s*:\s*(.+))?$", re.MULTILINE)

    matches = list(heading_re.finditer(body))
    for i, match in enumerate(matches):
        key = match.group(1).strip()
        inline_value = (match.group(2) or "").strip()

        # Body is everything between this heading and the next heading
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        body_text = body[start:end].strip()

        if inline_value:
            # Heading like: ## [FINDING 1 TITLE]: Understaffed Billing
            sections[key] = inline_value
            # If there is also body text, store it under the key without TITLE
            if body_text:
                base_key = key.replace(" TITLE", "")
                if base_key != key:
                    sections[base_key] = body_text
                else:
                    sections[key] = inline_value + "\n\n" + body_text
        else:
            sections[key] = body_text

    return sections


def parse_table_markdown(table_md: str) -> List[List[str]]:
    """Parse a markdown table into a list of rows (each row is a list of cells).

    Skips the separator row (``| --- | --- |``).  Returns an empty list if no
    table is found.
    """
    rows: List[List[str]] = []
    for line in table_md.strip().splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")]
        # Remove empty first/last from leading/trailing pipes
        if cells and cells[0] == "":
            cells = cells[1:]
        if cells and cells[-1] == "":
            cells = cells[:-1]
        # Skip separator rows
        if all(re.match(r"^-+$|^:?-+:?$", c) for c in cells):
            continue
        rows.append(cells)
    return rows


def parse_slide_markdown(content: str) -> List[dict]:
    """Parse presentation deck markdown into slides.

    Expected format::

        # Slide 1: Title Slide
        ## Slide Body
        Content for the slide face
        ## Slide Narration
        Content for speaker notes

        # Slide 2: Agenda
        ## Slide Body
        ...

    Returns a list of dicts: ``{"title", "body", "narration", "charts"}``.
    Charts are extracted from ``[CHART: name]`` markers in the body.
    """
    slides: List[dict] = []
    # Split on H1 headings
    slide_chunks = re.split(r"^#\s+", content, flags=re.MULTILINE)

    for chunk in slide_chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        # First line is the title
        title_line, _, rest = chunk.partition("\n")
        title = title_line.strip()
        # Remove "Slide N: " prefix if present
        title = re.sub(r"^Slide\s+\d+\s*:\s*", "", title).strip()

        body = ""
        narration = ""
        charts: List[str] = []

        # Split on H2 headings
        sub_sections = re.split(r"^##\s+", rest, flags=re.MULTILINE)
        for sub in sub_sections:
            sub = sub.strip()
            if not sub:
                continue
            sub_title, _, sub_body = sub.partition("\n")
            sub_title_lower = sub_title.strip().lower()
            sub_body = sub_body.strip()

            if "narration" in sub_title_lower or "notes" in sub_title_lower:
                narration = sub_body
            elif "body" in sub_title_lower or "content" in sub_title_lower:
                body = sub_body
            else:
                # Treat as additional body content
                body += "\n\n" + sub_body if body else sub_body

        # Extract chart placeholders from body
        for chart_match in re.finditer(r"\[CHART:\s*([^\]]+)\]", body):
            charts.append(chart_match.group(1).strip())

        slides.append({
            "title": title,
            "body": body,
            "narration": narration,
            "charts": charts,
        })

    return slides
