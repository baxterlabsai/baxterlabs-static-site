"""Phase 7 Document Renderer — produces branded .docx/.pptx from markdown + templates.

Opens a template file, finds ``[PLACEHOLDER]`` text in paragraphs / table cells /
slide shapes, and replaces it with the actual content parsed from Phase 5 markdown.
Formatting (font, size, colour, bold/italic) is preserved from the template.

Chart placeholders (``[CHART: chart_type]``) are replaced with PNG images
downloaded from Supabase storage via the ``engagement_graphics`` table.
"""
from __future__ import annotations

import io
import logging
import os
import re
from copy import deepcopy
from typing import Dict, List, Optional, Tuple

from docx import Document
from docx.shared import Inches, Pt, Emu
from docx.oxml.ns import qn

from services.markdown_parser import (
    parse_deliverable_markdown,
    parse_table_markdown,
    parse_slide_markdown,
)
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.google_drive_engagement import (
    list_files_in_folder,
    download_file_by_id,
    upload_file_to_drive_folder,
)

logger = logging.getLogger("baxterlabs.document_renderer")

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

# Map output names to template filenames and output format
TEMPLATE_MAP: Dict[str, Tuple[str, str]] = {
    # output_name -> (template_filename, output_extension)
    "Executive Summary": ("10_Executive_Summary.docx", "docx"),
    "Full Diagnostic Report": ("09_Full_Diagnostic_Report.docx", "docx"),
    "Implementation Roadmap": ("26_90_Day_Implementation_Roadmap.docx", "docx"),
    "Phase 2 Retainer Proposal": ("17_Phase2_Retainer_Proposal.docx", "docx"),
    "Presentation Deck": ("11_Presentation_Deck.pptx", "pptx"),
}

# Regex to match any [PLACEHOLDER] pattern in text
_PLACEHOLDER_RE = re.compile(r"\[([^\]]+)\]")


# ---------------------------------------------------------------------------
# Chart helpers
# ---------------------------------------------------------------------------

def _fetch_chart_png(engagement_id: str, chart_type: str) -> Optional[Tuple[bytes, dict]]:
    """Download the PNG for a chart type from Supabase storage.

    Returns ``(png_bytes, graphics_row)`` or ``None`` if not available.
    """
    sb = get_supabase()
    result = (
        sb.table("engagement_graphics")
        .select("*")
        .eq("engagement_id", engagement_id)
        .eq("chart_type", chart_type)
        .eq("status", "completed")
        .limit(1)
        .execute()
    )
    if not result.data:
        logger.warning("No completed graphic for chart_type=%s eng=%s", chart_type, engagement_id)
        return None

    row = result.data[0]
    storage_path = row.get("storage_path")
    bucket = row.get("storage_bucket", "engagements")
    if not storage_path:
        return None

    try:
        png_bytes = sb.storage.from_(bucket).download(storage_path)
        return (png_bytes, row) if png_bytes else None
    except Exception as e:
        logger.error("Failed to download chart PNG %s: %s", storage_path, e)
        return None


# ---------------------------------------------------------------------------
# DOCX rendering
# ---------------------------------------------------------------------------

def _replace_run_text(run, new_text: str) -> None:
    """Replace the text in a Run while preserving its formatting."""
    run.text = new_text


def _replace_paragraph_text(paragraph, new_text: str) -> None:
    """Replace all text in a paragraph while preserving the first run's formatting.

    If the paragraph has multiple runs, we collapse them into the first run
    and set its text.  Formatting of the first run is kept.
    """
    if not paragraph.runs:
        paragraph.text = new_text
        return

    # Keep the first run with its formatting, clear the rest
    first_run = paragraph.runs[0]
    first_run.text = new_text
    for run in paragraph.runs[1:]:
        run.text = ""


def _replace_placeholder_in_text(text: str, key: str, value: str) -> str:
    """Replace ``[key]`` in *text* with *value*, case-insensitive on key."""
    pattern = re.compile(re.escape(f"[{key}]"), re.IGNORECASE)
    return pattern.sub(value, text)


def _add_multi_paragraph_content(doc, paragraph, content: str, engagement_id: str) -> None:
    """Replace a placeholder paragraph with potentially multiple paragraphs.

    Splits *content* on double-newlines to create separate paragraphs.
    Each new paragraph clones the style of the original.  The original
    paragraph's text is replaced with the first chunk; additional paragraphs
    are inserted after it.

    ``[CHART: ...]`` markers within the content are replaced with images.
    """
    chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
    if not chunks:
        _replace_paragraph_text(paragraph, "")
        return

    style = paragraph.style
    parent = paragraph._element.getparent()
    current_element = paragraph._element

    for i, chunk in enumerate(chunks):
        # Check for chart placeholder in chunk
        chart_match = re.match(r"^\[CHART:\s*([^\]]+)\]$", chunk.strip())
        if chart_match:
            chart_type = chart_match.group(1).strip()
            _insert_chart_after(doc, parent, current_element, engagement_id, chart_type)
            if i == 0:
                _replace_paragraph_text(paragraph, "")
            continue

        if i == 0:
            _replace_paragraph_text(paragraph, chunk)
        else:
            # Create a new paragraph element after the current one
            new_p = deepcopy(paragraph._element)
            # Clear runs and set text
            for r in new_p.findall(qn("w:r")):
                new_p.remove(r)
            from docx.oxml import OxmlElement
            run_elem = OxmlElement("w:r")
            # Copy run properties from original first run if available
            if paragraph.runs:
                orig_rpr = paragraph.runs[0]._element.find(qn("w:rPr"))
                if orig_rpr is not None:
                    run_elem.append(deepcopy(orig_rpr))
            t_elem = OxmlElement("w:t")
            t_elem.set(qn("xml:space"), "preserve")
            t_elem.text = chunk
            run_elem.append(t_elem)
            new_p.append(run_elem)

            current_element.addnext(new_p)
            current_element = new_p


def _insert_chart_after(doc, parent, after_element, engagement_id: str, chart_type: str) -> None:
    """Insert a chart image as a new paragraph after *after_element*."""
    result = _fetch_chart_png(engagement_id, chart_type)
    if not result:
        logger.warning("Skipping chart placeholder [CHART: %s] — no image available", chart_type)
        return

    png_bytes, row = result

    # Determine dimensions
    placements = row.get("output_placements") or []
    width = Inches(6)  # default
    if placements:
        # Use first placement's canvas_size if available
        for p in placements:
            if isinstance(p, dict) and p.get("canvas_size"):
                cs = p["canvas_size"]
                w = cs.get("width_inches") or cs.get("width")
                if w:
                    width = Inches(float(w))
                break

    from docx.oxml import OxmlElement
    new_p = OxmlElement("w:p")
    after_element.addnext(new_p)

    # We need to add the image via the document's inline shape mechanism.
    # Create a temporary paragraph wrapper to use python-docx's add_picture.
    from docx.text.paragraph import Paragraph
    temp_para = Paragraph(new_p, parent)
    run = temp_para.add_run()
    run.add_picture(io.BytesIO(png_bytes), width=width)


def render_docx(
    template_path: str,
    markdown_content: str,
    engagement_id: str,
    client_name: str,
    engagement_date: str,
) -> bytes:
    """Render a .docx file by replacing template placeholders with markdown content.

    Returns the rendered document as bytes.
    """
    doc = Document(template_path)
    sections = parse_deliverable_markdown(markdown_content)

    # Ensure client name and date are in the sections map
    sections.setdefault("CLIENT COMPANY NAME", client_name)
    sections.setdefault("ENGAGEMENT DATE", engagement_date)

    # --- Process paragraphs ---
    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        # Check for full-paragraph section placeholders: [SECTION N: ...]
        full_match = re.match(r"^\[([^\]]+)\]\s*$", text)
        if full_match:
            key = full_match.group(1).strip()
            # Try exact match first, then match on prefix (e.g. "SECTION 1: PURPOSE" matches "SECTION 1: PURPOSE - instructions...")
            replacement = _find_section_content(sections, key)
            if replacement is not None:
                if key.startswith("CHART:"):
                    chart_type = key.replace("CHART:", "").strip()
                    _replace_paragraph_text(paragraph, "")
                    _insert_chart_after(
                        doc, paragraph._element.getparent(),
                        paragraph._element, engagement_id, chart_type,
                    )
                else:
                    _add_multi_paragraph_content(doc, paragraph, replacement, engagement_id)
            continue

        # Check for inline placeholders within headings or mixed text
        # e.g. "Finding 1: [FINDING 1 TITLE]" or "4.1 Revenue Leaks - [REVENUE LEAKS SUBTOTAL]"
        placeholders = _PLACEHOLDER_RE.findall(text)
        if placeholders:
            new_text = text
            for ph_key in placeholders:
                replacement = _find_section_content(sections, ph_key)
                if replacement is not None:
                    if ph_key.startswith("CHART:"):
                        # Chart in inline context — replace text and insert image
                        chart_type = ph_key.replace("CHART:", "").strip()
                        new_text = new_text.replace(f"[{ph_key}]", "")
                        _insert_chart_after(
                            doc, paragraph._element.getparent(),
                            paragraph._element, engagement_id, chart_type,
                        )
                    else:
                        new_text = new_text.replace(f"[{ph_key}]", replacement)
            if new_text != text:
                _replace_paragraph_text(paragraph, new_text)

    # --- Process tables ---
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                cell_text = cell.text.strip()
                if not cell_text:
                    continue
                placeholders = _PLACEHOLDER_RE.findall(cell_text)
                if not placeholders:
                    continue
                new_text = cell_text
                for ph_key in placeholders:
                    replacement = _find_section_content(sections, ph_key)
                    if replacement is not None:
                        new_text = new_text.replace(f"[{ph_key}]", replacement)
                if new_text != cell_text:
                    # Replace text in first paragraph of cell
                    if cell.paragraphs:
                        _replace_paragraph_text(cell.paragraphs[0], new_text)

    # Save to bytes
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _find_section_content(sections: Dict[str, str], key: str) -> Optional[str]:
    """Find content for a placeholder key in the sections dict.

    Tries exact match first, then prefix match (template placeholders often
    include instructions after the key, e.g.
    ``[SECTION 1: PURPOSE - 1 paragraph summarizing...]``).
    """
    # Exact match
    if key in sections:
        return sections[key]

    # The template key may include instructions after a dash/comma.
    # Try matching on the portion before the first dash or the first few words.
    key_prefix = key.split(" - ")[0].strip()
    if key_prefix in sections:
        return sections[key_prefix]

    # Try normalised comparison
    key_lower = key.lower().strip()
    for sec_key, sec_val in sections.items():
        if sec_key.lower().strip() == key_lower:
            return sec_val
        # Prefix match: template key starts with section key
        sec_prefix = sec_key.split(" - ")[0].strip().lower()
        if sec_prefix == key_lower or key_lower == sec_prefix:
            return sec_val

    return None


# ---------------------------------------------------------------------------
# PPTX rendering
# ---------------------------------------------------------------------------

def render_pptx(
    template_path: str,
    markdown_content: str,
    engagement_id: str,
    client_name: str,
    engagement_date: str,
) -> bytes:
    """Render a .pptx file by replacing placeholder text in slide shapes.

    Returns the rendered presentation as bytes.
    """
    # Import here to avoid PIL import error at module level on some systems
    import zipfile
    from lxml import etree

    slides_data = parse_slide_markdown(markdown_content)

    ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"

    # Work directly with the zip to avoid python-pptx PIL dependency issues
    buf_in = io.BytesIO(open(template_path, "rb").read())
    buf_out = io.BytesIO()

    with zipfile.ZipFile(buf_in, "r") as zin, zipfile.ZipFile(buf_out, "w") as zout:
        slide_files = sorted(
            [f for f in zin.namelist() if f.startswith("ppt/slides/slide") and f.endswith(".xml")]
        )
        notes_files = sorted(
            [f for f in zin.namelist() if f.startswith("ppt/notesSlides/notesSlide") and f.endswith(".xml")]
        )

        # Build a mapping of slide XML files to slide data
        # Template slides are numbered slide1.xml, slide2.xml, etc.
        slide_map: Dict[str, dict] = {}
        for i, sf in enumerate(slide_files):
            if i < len(slides_data):
                slide_map[sf] = slides_data[i]

        for item in zin.infolist():
            data = zin.read(item.filename)

            if item.filename in slide_map:
                # Replace placeholder text in slide XML
                slide_data = slide_map[item.filename]
                data = _replace_pptx_slide_text(
                    data, slide_data, client_name, engagement_date,
                )

            # Replace notes slide content with narration
            if item.filename in notes_files:
                # Find corresponding slide index
                idx_match = re.search(r"notesSlide(\d+)\.xml", item.filename)
                if idx_match:
                    slide_idx = int(idx_match.group(1)) - 1
                    if slide_idx < len(slides_data) and slides_data[slide_idx].get("narration"):
                        data = _replace_pptx_notes(data, slides_data[slide_idx]["narration"])

            zout.writestr(item, data)

    return buf_out.getvalue()


def _replace_pptx_slide_text(
    slide_xml: bytes,
    slide_data: dict,
    client_name: str,
    engagement_date: str,
) -> bytes:
    """Replace [PLACEHOLDER] text in a slide's XML with actual content."""
    tree = etree.fromstring(slide_xml)
    ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"

    # Collect all text elements
    for t_elem in tree.iter(f"{{{ns_a}}}t"):
        if t_elem.text is None:
            continue
        text = t_elem.text

        # Replace known simple placeholders
        text = text.replace("[CLIENT COMPANY NAME]", client_name)
        text = text.replace("[COMPANY NAME]", client_name)
        text = text.replace("[DATE]", engagement_date)

        # Replace generic placeholders from slide body
        # For slide-level content, we map body text to the slide shapes
        # The body content from markdown replaces placeholder patterns
        placeholders = _PLACEHOLDER_RE.findall(text)
        for ph in placeholders:
            # Check if this is a simple value placeholder like [AMOUNT], [Action Item 1], etc.
            # These will be populated by the body content of the slide
            body = slide_data.get("body", "")
            # For now, keep complex slide replacement simple —
            # replace the placeholder with its key stripped of brackets
            pass

        t_elem.text = text

    return etree.tostring(tree, xml_declaration=True, encoding="UTF-8", standalone=True)


def _replace_pptx_notes(notes_xml: bytes, narration: str) -> bytes:
    """Replace the notes slide content with narration text."""
    tree = etree.fromstring(notes_xml)
    ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"

    # Find the notes text body — look for txBody elements
    for txBody in tree.iter(f"{{{ns_a}}}txBody"):
        # Check if this is the notes text body (not the slide number placeholder)
        paragraphs = txBody.findall(f"{{{ns_a}}}p")
        if len(paragraphs) <= 1:
            continue

        # Clear existing paragraphs except the first (which may have formatting)
        first_p = paragraphs[0]
        for p in paragraphs[1:]:
            txBody.remove(p)

        # Set text on the first paragraph
        for r in first_p.findall(f"{{{ns_a}}}r"):
            t = r.find(f"{{{ns_a}}}t")
            if t is not None:
                t.text = narration
                break
        else:
            # No existing run — create one
            r_elem = etree.SubElement(first_p, f"{{{ns_a}}}r")
            t_elem = etree.SubElement(r_elem, f"{{{ns_a}}}t")
            t_elem.text = narration
        break

    return etree.tostring(tree, xml_declaration=True, encoding="UTF-8", standalone=True)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def render_engagement_deliverables(engagement_id: str) -> List[dict]:
    """Render all QC-approved .md files from Drive into .docx/.pptx.

    Downloads markdown files from the engagement's 04_Deliverables Drive folder,
    loads the corresponding template from ``backend/templates/``, renders,
    and uploads the result back to the same Drive folder.

    Returns a list of ``{"output_name", "output_file", "drive_file_id"}`` dicts.
    """
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise ValueError(f"Engagement {engagement_id} not found")

    sb = get_supabase()
    deliverables_folder_id = eng.get("drive_deliverables_folder_id")
    if not deliverables_folder_id:
        raise ValueError("Engagement has no Drive deliverables folder configured")

    # Get client info
    client_row = sb.table("clients").select("company_name").eq("id", eng["client_id"]).limit(1).execute()
    client_name = client_row.data[0]["company_name"] if client_row.data else "Client"

    from datetime import date
    engagement_date = ""
    if eng.get("start_date"):
        try:
            d = date.fromisoformat(str(eng["start_date"])[:10])
            engagement_date = d.strftime("%B %Y")
        except (ValueError, TypeError):
            engagement_date = str(eng["start_date"])

    # List .md files in the deliverables folder
    md_files = await list_files_in_folder(deliverables_folder_id, extension=".md")
    if not md_files:
        logger.info("No .md files found in deliverables folder for %s", engagement_id)
        return []

    results: List[dict] = []

    for md_file in md_files:
        filename = md_file["name"]
        # Derive output name from filename: "Executive_Summary.md" -> "Executive Summary"
        output_name = filename.rsplit(".", 1)[0].replace("_", " ")

        # Find matching template
        template_info = TEMPLATE_MAP.get(output_name)
        if not template_info:
            logger.info("No template mapping for '%s' — skipping", output_name)
            continue

        template_filename, output_ext = template_info
        template_path = os.path.join(TEMPLATES_DIR, template_filename)
        if not os.path.exists(template_path):
            logger.error("Template file not found: %s", template_path)
            continue

        # Download the markdown content
        file_bytes = await download_file_by_id(md_file["id"])
        if not file_bytes:
            logger.error("Failed to download %s from Drive", filename)
            continue

        markdown_content = file_bytes.decode("utf-8")

        # Render
        try:
            if output_ext == "pptx":
                rendered_bytes = render_pptx(
                    template_path, markdown_content, engagement_id,
                    client_name, engagement_date,
                )
            else:
                rendered_bytes = render_docx(
                    template_path, markdown_content, engagement_id,
                    client_name, engagement_date,
                )
        except Exception as e:
            logger.error("Render failed for %s: %s", output_name, e, exc_info=True)
            continue

        # Upload rendered file back to Drive
        output_filename = f"{output_name.replace(' ', '_')}.{output_ext}"
        mimetype = (
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            if output_ext == "pptx" else
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        drive_file_id = await upload_file_to_drive_folder(
            deliverables_folder_id,
            output_filename,
            rendered_bytes,
            mimetype,
        )

        if drive_file_id:
            results.append({
                "output_name": output_name,
                "output_file": output_filename,
                "drive_file_id": drive_file_id,
                "size_bytes": len(rendered_bytes),
            })
            logger.info("Rendered %s -> %s (Drive: %s)", filename, output_filename, drive_file_id)
        else:
            logger.error("Failed to upload %s to Drive", output_filename)

    # Log activity
    if results:
        log_activity(engagement_id, "system", "deliverables_rendered", {
            "rendered_count": len(results),
            "files": [r["output_file"] for r in results],
        })

    return results
