# BaxterLabs Graphics Specification
## For use by Cowork graphics-generation skill (Session D)

### Color Palette (from Brand Style Guide)
- Deep Crimson:  #66151C  — primary bars, titles, revenue leaks
- Dark Teal:     #005454  — secondary bars, Quick Win tier
- Gold:          #C9A84C  — accent bars, Strategic tier, callouts
- Charcoal:      #2D3436  — all body text, axis labels
- Soft Red:      #C0392B  — negative values, risk, Structural tier
- Forest Green:  #2D6A4F  — positive/recovery values, aggressive scenario
- Ivory:         #FAF9F7  — chart backgrounds
- Warm Gray:     #B2ACA4  — gridlines, conservative scenario, secondary

### Chart Defaults
- Font:          Inter (fallback: Arial) for labels and axes
- Title font:    Playfair Display (fallback: Georgia), Deep Crimson
- Background:    Ivory (#FAF9F7)
- Gridlines:     Warm Gray (#B2ACA4), 0.5px, horizontal only
- Canvas size:   1200 × 800px at 144dpi (retina-ready)
- Output format: PNG
- Padding:       60px all sides minimum

### Priority Tier Colors (Gantt and Priority Matrix)
- Quick Win:   Dark Teal    #005454
- Strategic:   Gold         #C9A84C
- Structural:  Deep Crimson #66151C

### Scenario Colors (grouped bar, recovery ramp)
- Conservative: Warm Gray    #B2ACA4
- Moderate:     Dark Teal    #005454
- Aggressive:   Forest Green #2D6A4F

---

### Chart Type Specifications

#### waterfall
Data source: Phase 3 canonical figures, moderate scenario
- X-axis: 12 leak names abbreviated, sorted largest→smallest
- Y-axis: Dollar amounts, $0 to $1.0M+
- Bar colors: Deep Crimson=revenue leaks, Gold=cost leaks,
  Dark Teal=process leaks
- Annotation: dollar amount above each bar
- Title: "Annual Profit Leak by Category — Moderate Scenario"

#### grouped_bar
Data source: Phase 3 canonical figures, all 3 scenarios
- X-axis: 12 leak names abbreviated
- Y-axis: Dollar amounts
- 3 grouped bars per leak: Conservative (gray), Moderate (teal),
  Aggressive (green)
- Title: "Profit Leak Scenarios — All 12 Categories"

#### donut
Data source: Phase 3 canonical figures, moderate scenario
- 3 segments: Revenue (Deep Crimson), Cost (Gold),
  Process (Dark Teal)
- Center label: "$3.4M Total"
- Legend: $ amount and % for each segment
- Title: "Profit Leak Composition — Moderate Scenario"

#### summary_table
Data source: Phase 3 canonical figures
- 4-column table rendered as image: Category, Conservative,
  Moderate, Aggressive
- Header row: Deep Crimson background, white text
- Subtotal rows: Dark Teal background, white text
- Total row: Charcoal background, white text, bold
- Title: "Profit Leak Summary — All Scenarios"

#### equity_trajectory
Data source: Phase 3 balance sheet figures
- Dual-axis line chart
- Left axis: Equity ($K) — Forest Green line, annotate $420K and $84K
- Right axis: Revolver balance ($M) — Soft Red line
- X-axis: 6 quarters Q2 FY2022 → Q4 FY2024
- Marker: covenant breach at Q3 FY2024 with label
- Title: "Equity Erosion and Revolver Growth FY2022–FY2024"

#### margin_compression
Data source: Phase 3 financial figures
- Bar chart, 3 bars: FY2022 (Forest Green), FY2023 (Gold),
  FY2024 (Soft Red)
- Y-axis: Gross margin % (42% to 48% range)
- Annotation: "260bp compression" arrow between FY2022 and FY2024
  bars
- Title: "Gross Margin Compression FY2022–FY2024"

#### gantt
Data source: Phase 5 Output 4 roadmap initiatives
- Rows: All implementation initiatives grouped by tier
  (Quick Win, Strategic, Structural)
- Columns: Weeks 1–12
- Bar colors by tier: Quick Win=Teal, Strategic=Gold,
  Structural=Crimson
- Row labels: initiative code + short name
  e.g. "QW-1: Engagement Letters"
- Title: "90-Day Implementation Roadmap"

#### priority_matrix
Data source: Phase 5 Output 4 priority matrix
- 2×2 quadrant chart
- X-axis: Implementation Effort (Low → High)
- Y-axis: Financial Impact (Low → High)
- Each initiative plotted as labeled dot, colored by tier
- Quadrant labels: "Quick Wins" (top-left), "Strategic"
  (top-right), "Efficiency Gains" (bottom)
- Title: "Initiative Priority Matrix"

#### recovery_ramp
Data source: Phase 5 Output 4 quarterly recovery projections
- X-axis: Q1, Q2, Q3, Q4
- Y-axis: Cumulative annual run-rate recovery ($)
- 3 lines: Conservative (gray), Moderate (teal), Aggressive (green)
- Title: "Profit Recovery Trajectory by Scenario"

#### roi_summary
Data source: Phase 5 Output 5 ROI figures
- Large-number layout, 3 key metrics:
  - "46.4x" ROI multiple — large Deep Crimson
  - "$72,500" total investment — large Charcoal
  - "7.7 days" payback — large Forest Green
- BaxterLabs wordmark bottom right
- Subtitle: "Moderate Scenario ROI Analysis"
- Background: Ivory with Deep Crimson header band

---

### Storage
- Bucket:    engagements
- Path:      {engagement_id}/graphics/{chart_type}.png
- Register:  POST /api/engagements/{id}/graphics
- Retrieve:  GET  /api/engagements/{id}/graphics
