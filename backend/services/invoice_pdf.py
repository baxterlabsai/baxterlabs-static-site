"""Invoice PDF generation using ReportLab."""

from __future__ import annotations

import io
import logging
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

logger = logging.getLogger("baxterlabs.invoice_pdf")

# Brand colors
DEEP_CRIMSON = colors.HexColor("#66151C")
DARK_TEAL = colors.HexColor("#005454")
GOLD = colors.HexColor("#C9A84C")
CHARCOAL = colors.HexColor("#2D3436")
IVORY = colors.HexColor("#FAF8F2")


def generate_invoice_pdf(
    invoice_number: str,
    invoice_type: str,
    amount: float,
    issued_at: str,
    due_date: str,
    company_name: str,
    contact_name: str,
    contact_email: str,
    engagement_fee: float,
    payment_link: Optional[str] = None,
) -> bytes:
    """Generate a branded invoice PDF. Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_style = ParagraphStyle(
        "InvoiceHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=DEEP_CRIMSON,
        spaceAfter=4,
    )
    tagline_style = ParagraphStyle(
        "Tagline",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=GOLD,
        spaceAfter=12,
    )
    invoice_title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=CHARCOAL,
        alignment=TA_RIGHT,
        spaceAfter=4,
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=CHARCOAL,
        spaceAfter=2,
    )
    value_style = ParagraphStyle(
        "Value",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=CHARCOAL,
        spaceAfter=2,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#6B7280"),
    )
    total_style = ParagraphStyle(
        "Total",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=DEEP_CRIMSON,
        alignment=TA_RIGHT,
    )
    pay_style = ParagraphStyle(
        "PayLink",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=DARK_TEAL,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#6B7280"),
        alignment=TA_CENTER,
    )

    elements = []

    # --- Header ---
    elements.append(Paragraph("BaxterLabs Advisory", header_style))
    elements.append(Paragraph("Operational Diagnostics for Mid-Market Firms", tagline_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=16))

    # --- Invoice details (right-side info table) ---
    type_label = "Deposit Invoice (50%)" if invoice_type == "deposit" else "Final Invoice (50%)"
    detail_data = [
        [Paragraph("<b>INVOICE</b>", ParagraphStyle("R", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=CHARCOAL, alignment=TA_RIGHT)), ""],
        ["", ""],
        [Paragraph("Invoice Number:", label_style), Paragraph(invoice_number, value_style)],
        [Paragraph("Type:", label_style), Paragraph(type_label, value_style)],
        [Paragraph("Date Issued:", label_style), Paragraph(issued_at, value_style)],
        [Paragraph("Due Date:", label_style), Paragraph(due_date, value_style)],
    ]
    detail_table = Table(detail_data, colWidths=[1.2 * inch, 2.5 * inch])
    detail_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))

    # --- Bill To / From in a two-column layout ---
    bill_to = [
        Paragraph("BILL TO", label_style),
        Paragraph(company_name, ParagraphStyle("BillTo", parent=value_style, fontName="Helvetica-Bold", fontSize=11)),
        Paragraph(contact_name, value_style),
        Paragraph(contact_email, value_style),
    ]
    from_block = [
        Paragraph("FROM", label_style),
        Paragraph("BaxterLabs Advisory", ParagraphStyle("From", parent=value_style, fontName="Helvetica-Bold", fontSize=11)),
        Paragraph("San Francisco, CA", value_style),
        Paragraph("info@baxterlabs.ai", value_style),
    ]

    # Combine bill-to, from, and invoice details in a header table
    header_table_data = [[
        bill_to[0],
        from_block[0],
        detail_data[0][0],
    ]]
    # Build each column as paragraphs
    left_col = "<br/>".join([
        "<b>BILL TO</b>",
        f"<b>{company_name}</b>",
        contact_name,
        contact_email,
    ])
    mid_col = "<br/>".join([
        "<b>FROM</b>",
        "<b>BaxterLabs Advisory</b>",
        "San Francisco, CA",
        "info@baxterlabs.ai",
    ])
    right_col = "<br/>".join([
        f"<b>Invoice #:</b> {invoice_number}",
        f"<b>Type:</b> {type_label}",
        f"<b>Issued:</b> {issued_at}",
        f"<b>Due:</b> {due_date}",
    ])

    info_style = ParagraphStyle("Info", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=CHARCOAL, leading=14)
    info_right = ParagraphStyle("InfoR", parent=info_style, alignment=TA_RIGHT)

    info_table = Table(
        [[Paragraph(left_col, info_style), Paragraph(mid_col, info_style), Paragraph(right_col, info_right)]],
        colWidths=[2.3 * inch, 2.3 * inch, 2.4 * inch],
    )
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 24))

    # --- Line items table ---
    amount_str = f"${amount:,.2f}"
    fee_str = f"${engagement_fee:,.2f}"
    desc = f"14-Day Operational Diagnostic — {invoice_type.title()} ({type_label.split('(')[1]}" if "(" in type_label else f"14-Day Operational Diagnostic — {invoice_type.title()}"
    desc = f"14-Day Operational Diagnostic — {invoice_type.title()} (50%)"

    header_cell_style = ParagraphStyle("HeaderCell", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.white)
    cell_style = ParagraphStyle("Cell", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=CHARCOAL)
    cell_right = ParagraphStyle("CellR", parent=cell_style, alignment=TA_RIGHT)

    line_data = [
        [Paragraph("Description", header_cell_style), Paragraph("Amount", ParagraphStyle("HR", parent=header_cell_style, alignment=TA_RIGHT))],
        [Paragraph(desc, cell_style), Paragraph(amount_str, cell_right)],
    ]

    line_table = Table(line_data, colWidths=[5.0 * inch, 2.0 * inch])
    line_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("BACKGROUND", (0, 1), (-1, -1), IVORY),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 10),
        ("TOPPADDING", (0, 1), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, 0), 1, DARK_TEAL),
        ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#E5E7EB")),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 8))

    # --- Subtotal / total line ---
    sub_label = ParagraphStyle("SubL", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#6B7280"), alignment=TA_RIGHT)
    total_line_data = [
        [Paragraph(f"Engagement Total: {fee_str}", sub_label), Paragraph("", sub_label)],
        [Paragraph("", sub_label), Paragraph("", sub_label)],
        [Paragraph("<b>Amount Due</b>", ParagraphStyle("TotalL", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, textColor=CHARCOAL, alignment=TA_RIGHT)),
         Paragraph(f"<b>{amount_str}</b>", ParagraphStyle("TotalR", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, textColor=DEEP_CRIMSON, alignment=TA_RIGHT))],
    ]
    total_table = Table(total_line_data, colWidths=[5.0 * inch, 2.0 * inch])
    total_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 24))

    # --- Payment section ---
    if payment_link:
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB"), spaceAfter=12))
        elements.append(Paragraph("Pay Online", pay_style))
        link_style = ParagraphStyle("Link", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=DARK_TEAL, alignment=TA_CENTER)
        elements.append(Paragraph(f'<a href="{payment_link}" color="#005454">{payment_link}</a>', link_style))
        elements.append(Spacer(1, 16))

    # --- Footer ---
    elements.append(Spacer(1, 24))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB"), spaceAfter=8))
    elements.append(Paragraph(
        "Payment due within 14 days of invoice date. Questions? Contact info@baxterlabs.ai",
        footer_style,
    ))

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()
    logger.info(f"Invoice PDF generated — {invoice_number} ({len(pdf_bytes)} bytes)")
    return pdf_bytes
