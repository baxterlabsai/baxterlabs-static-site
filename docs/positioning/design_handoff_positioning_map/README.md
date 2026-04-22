# Handoff: BaxterLabs Positioning Map

## Overview

A stunning, editorial competitive positioning visual for the BaxterLabs marketing site. The element plots four players (BaxterLabs Advisory, Big 4 Consulting, Fractional CFO, Status Quo) on a 2×2 matrix and makes a clear visual argument that **BaxterLabs occupies the upper-right quadrant that no competitor can**.

Two matrices share one shell:

- **Matrix A — Depth of Analysis × Speed of Delivery** (default view)
- **Matrix B — Enterprise Rigor × Accessibility / Price**

Users switch between matrices via a tab control or the in-design Tweaks panel. This is intended as a **feature section on a long-form page** (likely Services or About, or as a dedicated "Why BaxterLabs" page).

Source narrative: `BaxterLabs_Positioning_Map_v1_1.md` (included). Visual system: the BaxterLabs Design System (v1.1 brand style guide).

---

## About the Design Files

The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, not production code to copy directly. The HTML uses vanilla JS for the tab/Tweaks interactions. Your task is to **recreate this design in the BaxterLabs marketing site codebase** (React/Vite/Tailwind v4, per `baxterlabs-static-site/`) using its established components, tokens, and patterns.

If you're implementing this somewhere else (i.e. no existing env), React + Tailwind is the recommended choice since the design system is already expressed in Tailwind v4 theme variables.

---

## Fidelity

**High-fidelity.** Colors, typography, spacing, and dot positions are final. Recreate pixel-perfectly using the codebase's existing design tokens from `src/index.css` (the `@theme` block). Do **not** introduce new colors, new fonts, or new radii — every token used is already defined.

---

## Screens / Views

This is a single section embedded in a larger page. It has five stacked blocks:

### 1. Section Header (2-column, 5/7 split on ≥900px)

- **Left column**: eyebrow (`THE COMPETITIVE LANDSCAPE — V1.1`) + H1.
- **Right column**: deck paragraph (Newsreader, `1.1rem`, `--fg-2`, max-width ~38rem).
- **Eyebrow rule**: 40px × 1px gold line (`#C9A84C`), flex-gapped 1rem from the label.
- **H1**: Playfair Display italic 700, `clamp(2.4rem, 4vw + 0.5rem, 4rem)`, color `#66151C` (crimson), `line-height: 1.02`, `letter-spacing: -0.015em`. The word "sits" is set roman (non-italic) inline for a subtle typographic breather.
- Copy: *"Where BaxterLabs sits on the map."* / deck: *"Four options exist for a professional service firm that suspects its margin is leaking. Only one of them delivers enterprise-grade diagnostic rigor at a price a managing partner can approve without a board vote."* ("enterprise-grade diagnostic rigor" emphasized in teal italic via `<em>`.)
- Margin-bottom: 5rem.

### 2. Meta Strip

A single row of 5 meta items, top and bottom border `1px solid #E5E7EB`, padding `1.25rem 0`, gap `2rem 3rem`, flex-wrap.

Each item is a vertical stack:
- **Label**: Inter 700, 10px, uppercase, tracking `0.2em`, color `#6B7280`.
- **Value**: Inter 500, 14px, color `#2D3436`.
- **Crimson override** (for "Fixed Scope" value only): Playfair Display italic 700, 16px, color `#66151C`.

Items in order:
| Label | Value |
|---|---|
| SEGMENT | $5M–$50M Professional Services |
| FIXED SCOPE | **14 Days · $12,500** (crimson override) |
| TYPICAL RECOVERY | $200K–$1M / year |
| DELIVERY | Two Partners, Personally |
| METHODOLOGY | 8-Phase, AI-Assisted Pipeline |

### 3. Matrix Tabs

Inline-flex button group, white bg, 1px light-gray border. Two buttons:
- `MATRIX A · DEPTH × SPEED`
- `MATRIX B · RIGOR × PRICE`

Tab styling: Inter 700, 0.7rem, uppercase, tracking `0.2em`, padding `0.75rem 1.5rem`, right border `1px solid #E5E7EB` except last.

- **Inactive**: color `#6B7280`, background transparent. Hover → color teal `#005454`, background cream `#F6E7C8`.
- **Active**: background teal `#005454`, color white.

Margin-bottom: 2.5rem.

### 4. Matrix Layout (7/5 split on ≥1000px, gap 4rem)

Left: **Chart Card**. Right: **Side Column**. Stacks to 1 column below 1000px.

#### 4a. Chart Card (the hero of the section)

White background, `1px solid #E5E7EB`, `shadow-xl` (Tailwind default), padding `2.5rem 2.5rem 2rem`.

**Chart title row** (flex row, space-between, baseline-aligned, bottom border `1px solid #E5E7EB`, padding-bottom 1.25rem, margin-bottom 2rem):
- Left: small gold eyebrow (`MATRIX A`, 10px Inter 700 uppercase tracking `0.3em` color `#C9A84C`) above an italic Playfair crimson title: *"Depth of Analysis × Speed of Delivery"* (1.35rem, italic 700, color `#66151C`).
- Right: "4 PLAYERS / 1 QUADRANT WINS" — Inter 700, 10px, uppercase, tracking `0.2em`, color `#6B7280` (second line at 0.6 opacity).

**Chart box** (grid: auto 1fr, gap 1rem):

- **Y-axis column** (flex column, space-between, align-center, `min-height: 500px`, padding `0.5rem 0`):
  - Top: vertical-rl gold label `HIGH` (10px, tracking `0.3em`)
  - Middle: vertical-rl Newsreader italic 700 teal title (e.g. "Depth of Analysis"), 0.95rem
  - Bottom: vertical-rl gold label `LOW`

- **Plot wrap** (flex column, gap 0.75rem):
  - **Plot**: `aspect-ratio: 1/1`, full width, ivory bg `#FAF8F2`, `1px solid #E5E7EB` border, overflow hidden. Contains:
    - **Grid**: subtle 10% × 10% grid lines via `linear-gradient(to right, rgba(107,114,128,0.08) 1px, transparent 1px)` + same vertical.
    - **Mid-cross**: horizontal and vertical 1px lines at 50% (color `rgba(45, 52, 54, 0.2)`).
    - **Upper-right quadrant highlight**: absolute `top:0; right:0; width:50%; height:50%`, gold gradient `linear-gradient(135deg, rgba(201, 168, 76, 0.14), rgba(201, 168, 76, 0.04))`, with a **dashed gold 1px** border on its LEFT and BOTTOM edges (rgba(201, 168, 76, 0.5)). A small **triangular gold flag** (28px) in the corner via `::after` with `border-style: solid; border-width: 0 28px 28px 0; border-color: transparent #C9A84C transparent transparent`.
    - **Quadrant corner labels** (`.q-label`): Inter 700, 9px, tracking `0.25em`, uppercase, color `#6B7280` at 70% opacity, positioned 0.75rem from each corner. Upper-right label is gold `#C9A84C` at 100% opacity and reads: *"Upper-Right — The Answer"*.
    - **Dots**: see Components section below.
  - **X-axis row** (flex row, space-between, padding `0.25rem 0.5rem 0`):
    - Left: gold label `SLOW`
    - Center: Newsreader italic 700 teal "Speed of Delivery" (0.95rem)
    - Right: gold label `FAST`

#### 4b. Side Column (flex column, gap 2rem)

Three blocks top-to-bottom:

**Winner block** — left border `2px solid #005454`, padding `0.3rem 0 0.3rem 1.25rem`:
- Kicker: `THE UPPER-RIGHT` (Inter 700, 10px, tracking `0.3em`, uppercase, color `#6B7280`)
- Title: *BaxterLabs Advisory* (Playfair italic 700, 1.6rem, color `#66151C`; "Advisory" is set roman via inline `font-style: normal`)
- Subtitle: Newsreader 400, 1rem, line-height 1.55, color `--fg-2`. Matrix-specific copy (see Data below).

**Players list** — top-border `1px solid #E5E7EB`, each row:
- Grid `20px 1fr auto`, gap 0.9rem, align-center, padding `0.9rem 0`, bottom-border `1px solid #E5E7EB`.
- Cell 1: 12px swatch dot, `#6B7280`. BaxterLabs row: swatch is `#005454` with `box-shadow: 0 0 0 3px rgba(0,84,84,0.15)`.
- Cell 2: Newsreader 700 0.95rem name + Inter 500 0.7rem gray sub.
- Cell 3: small quadrant caption (Inter 700, 0.58rem, tracking `0.22em`, uppercase, `#6B7280`; gold on the BL row).
- BL row name color: teal.

**Compare grid** — `THE SPREAD` heading (same as `.compare-head`), then 2×2 grid of cells:
- Non-BL cell: ivory bg, left border `2px solid #C9A84C`.
- BL cell: cream bg `#F6E7C8`, left border `2px solid #66151C`.
- Each cell: small `compare-who` kicker (teal; crimson on BL), then big Playfair italic 1.4rem number (charcoal; crimson non-italic on BL), then tiny `compare-small` gray caption.

### 5. Footnote

Top border `1px solid #E5E7EB`, margin-top 3rem, padding-top 1.5rem, flex-row space-between, flex-wrap, Inter 0.7rem uppercase tracking `0.15em` color `#6B7280`.

- Left: "Positioning Map v1.1 · Internal · Apr 2026"
- Center: **"BaxterLabs Advisory"** — Playfair italic 700, 0.85rem, `text-transform: none`, `letter-spacing: 0`, color `#66151C`.
- Right: "Source: Positioning Memo §2–3"

---

## Components

### Dot (the core plot primitive)

Each player is rendered as an absolutely-positioned dot inside the plot, with:
- `left: {x}%`, `bottom: {y}%` (so y=0 is bottom — matches axis intuition)
- `transform: translate(-50%, 50%)` (centers the dot on its coordinate)

**Non-BL dot** (Big 4, Fractional CFO, Status Quo):
- 14px × 14px circle, background `#6B7280` (warm gray)
- `box-shadow: 0 0 0 4px rgba(107,114,128,0.15)` (soft gray halo)
- No animation.

**BaxterLabs dot**:
- 18px × 18px circle, background `#005454` (teal)
- `box-shadow: 0 0 0 5px rgba(0,84,84,0.14), 0 0 0 10px rgba(0,84,84,0.06)`
- Inner cream dot via `::after` (4px inset, cream `#F6E7C8`) — gives a "target ring" feel.
- **Pulse halo**: `::before` pseudo, 38×38px circle, 1px teal border, centered via translate(-50%,-50%), animating `scale(0.6→1.8)` and `opacity: 0.6→0` over 2.8s ease-out infinite.

**Dot label** (attached to each dot):
- Absolutely-positioned card at `top: 50%; transform: translateY(-50%)`.
- Anchored by left edge (`left: 28px`) OR right edge (`right: 28px`) depending on which side of the dot is safer to extend toward (data-driven — see Data).
- White background, `1px solid #E5E7EB`, `padding: 0.2rem 0.5rem`, `white-space: nowrap`.
- Name: Inter 600, 0.72rem, color `#2D3436`.
- Caption (quadrant name): Inter 700, 0.56rem, tracking `0.18em`, uppercase, color `#6B7280`, display block, margin-top 1px.
- **BL override**: background teal `#005454`, color white, border-color teal, Playfair italic 700 0.85rem, padding `0.3rem 0.6rem 0.35rem`. Mini caption color `rgba(255,255,255,0.7)`.

**Connector** (1px bridge from dot to label):
- Absolute, `top: 50%`, `height: 1px`, `width: 22px`, background `rgba(45, 52, 54, 0.25)`.
- For right-anchored labels: `left: 9px`. For left-anchored labels: `right: 9px`.

### Tweaks Panel (optional — only visible in tweak mode)

Fixed bottom-right, 280px wide, white bg, light-gray border, `shadow-xl`. Teal header strip with `TWEAKS` label. Three rows with segmented toggle buttons:

1. **Active Matrix** — A / B
2. **Quadrant Highlight** — Gold Tint / Off
3. **BL Pulse Halo** — On / Off

Each toggle: 1px light-gray border, split into equal flex-1 buttons, right border between. Active state = teal bg, white text. Inactive = white bg, charcoal text.

In the production codebase the Tweaks panel is **not required** — it's a design tool. Ship the component with Matrix A as the default and a tabbed toggle for Matrix B.

---

## Interactions & Behavior

- **Tab click** (Matrix A ↔ Matrix B): re-render the chart card + side column with the other matrix's data. All player dots, labels, axis titles, winner subtitle, and compare cells swap. Animation: 0.4s `bl-fade-in` on the dots only.
- **Tab active state**: teal bg, white text. The tab for the currently-visible matrix is always highlighted.
- **BL dot halo**: infinite 2.8s pulse. Pausable.
- **Hover states**: none on dots themselves (labels are always visible; no tooltips). Tabs gain cream bg + teal text on hover when inactive.
- **No click-to-explain on dots.** The side column's player list + compare grid already carries the detail. Keep the chart quiet.
- **Responsive**: below 1000px, layout stacks to 1 column (chart above, side column below). Plot stays 1:1 aspect. Below 900px, the section header stacks. Below 600px, the meta strip wraps (already does; no change needed).

---

## State Management

Only one piece of state: `activeMatrix: 'A' | 'B'`. All other data (player coords, labels, comparison numbers, winner copy) is static per matrix. No data fetching.

Recommended implementation:
```ts
const [activeMatrix, setActiveMatrix] = useState<'A' | 'B'>('A');
const m = MATRICES[activeMatrix];
```

Persist to `localStorage` if the design appears on a page a visitor might return to.

---

## Data

Both matrices share the same player set but different coordinates and accompanying copy. Coordinates are percentages on a 0–100 grid where `x=0` is left, `y=0` is bottom.

### Matrix A — Depth × Speed

- **Y axis**: Depth of Analysis (Low → High, bottom to top)
- **X axis**: Speed of Delivery (Slow → Fast, left to right)
- **Winner subtitle**: *"High depth, fast delivery. The 8-phase pipeline produces what traditional firms take 90 days to build — delivered in 14."*

| Player | x | y | Quadrant | Label side | Sub-caption |
|---|---|---|---|---|---|
| BaxterLabs Advisory | 86 | 86 | Upper-Right | left | 14 days · $12,500 · Two partners |
| Big 4 Consulting | 20 | 78 | Upper-Left | right | Deloitte, PwC, EY, KPMG |
| Fractional CFO | 78 | 22 | Lower-Right | left | $3K–$8K / month, embedded |
| Status Quo | 8 | 8 | Lower-Left | right | Instinct · monthly P&L only |

**Compare cells** (2×2):
1. BaxterLabs · **14 days** · "Fixed window" *(BL variant)*
2. Big 4 · **3–6 mo** · "Committee-driven"
3. BaxterLabs · **$12,500** · "Fixed fee" *(BL variant)*
4. Big 4 · **$150K–$500K** · "Enterprise pricing"

### Matrix B — Rigor × Accessibility (v1.1 corrected)

- **Y axis**: Enterprise Rigor (Low → High)
- **X axis**: Accessibility / Price (Expensive → Accessible)
- **Winner subtitle**: *"Audit-grade artifacts at a price a managing partner can approve without a board vote. The quadrant neither Big 4 nor a Fractional CFO can occupy."*

| Player | x | y | Quadrant | Label side | Sub-caption |
|---|---|---|---|---|---|
| BaxterLabs Advisory | 88 | 86 | Upper-Right | left | Audit-grade · one-time $12,500 |
| Big 4 Consulting | 15 | 80 | Upper-Left | right | Institutional rigor, enterprise fee |
| Fractional CFO | 72 | 22 | Lower-Right | left | Personal frameworks · retainer |
| **Status Quo** | **50** | **50** | **At Origin** | right | No methodology · no direct spend |

**Important — Matrix B v1.1 correction**: Status Quo sits at **the origin (50,50)**, NOT at the lower-left corner. This is an explicit v1.1 revision to prevent the visual from reading as "Status Quo costs as much as Big 4." The narrative carries the "hidden cost of inaction" argument separately; do not move Status Quo back to the lower-left.

**Compare cells**:
1. BaxterLabs · **$12,500** · "Discretionary budget" *(BL variant)*
2. Big 4 · **0.6–2%** · "Of firm revenue"
3. BaxterLabs · **Audit-grade** · "Citation provenance" *(BL variant)*
4. Fractional CFO · **Operational** · "Not forensic"

---

## Design Tokens

All tokens come from `baxterlabs-static-site/src/index.css` (`@theme` block) and are already defined — **do not introduce new values**. Full list reproduced in `colors_and_type.css` in this bundle.

**Colors used:**
| Role | Token | Hex |
|---|---|---|
| Crimson (primary, H1, BL compare border, crimson overrides) | `--color-primary` | `#66151C` |
| Teal (BL dot, secondary titles, tabs active, winner border, em) | `--color-secondary` | `#005454` |
| Ivory (page bg, plot bg, compare cell bg) | `--color-surface` | `#FAF8F2` |
| Cream (BL compare cell bg, tab hover) | `--color-surface-container-highest` | `#F6E7C8` |
| White (chart card bg, player labels, tweaks panel) | `--color-surface-container-lowest` | `#FFFFFF` |
| Light gray (borders, dividers, chart 1px lines) | `--color-surface-container` | `#E5E7EB` |
| Warm gray (non-BL dots, meta labels, fine print) | `--bl-gray-warm` | `#6B7280` |
| Gold (axis labels, quadrant highlight, compare border, rule) | `--bl-gold` | `#C9A84C` |
| Charcoal (body text) | `--color-on-surface` | `#2D3436` |

**Transparency uses**: `rgba(0, 84, 84, 0.14)` and `0.06` for BL dot rings, `rgba(201, 168, 76, 0.14)` and `0.04` for UR quadrant gradient, `rgba(201, 168, 76, 0.5)` for dashed quadrant border, `rgba(107, 114, 128, 0.08)` for plot 10% grid, `rgba(45, 52, 54, 0.2)` for mid-cross, `rgba(45, 52, 54, 0.25)` for connectors.

**Typography:**
| Role | Family | Weight/Style | Size |
|---|---|---|---|
| H1 section headline | Playfair Display | 700 italic | `clamp(2.4rem, 4vw + 0.5rem, 4rem)` |
| Chart title | Playfair Display | 700 italic | 1.35rem |
| Winner title | Playfair Display | 700 italic | 1.6rem |
| Compare cell big number | Playfair Display | 700 italic (roman on BL variant) | 1.4rem |
| Meta value (crimson override) | Playfair Display | 700 italic | 1rem |
| Footer brand mark | Playfair Display | 700 italic | 0.85rem |
| Deck paragraph | Newsreader | 400 | 1.1rem / 1.7 |
| Axis titles (in-plot) | Newsreader | 700 italic | 0.95rem |
| Winner subtitle | Newsreader | 400 | 1rem / 1.55 |
| Player name | Newsreader | 700 | 0.95rem |
| All labels, eyebrows, tabs, metadata | Inter | 500/600/700 per role | 10–14px |

**Spacing**: `padding: 6rem 1.5rem 8rem` on `.page` (7rem/3rem at md, 8rem/6rem at lg). Vertical rhythm between section header, meta strip, tabs, matrix, and footer is 3–5rem. Card interior padding `2.5rem 2.5rem 2rem`.

**Radii**: All 2px or square. No pill buttons, no rounded cards. Only dots/swatches are circular.

**Shadows**: chart card uses `shadow-xl` (Tailwind default). Tweaks panel also `shadow-xl`. No colored shadows.

---

## Assets

No imagery, no icons. The visual is 100% typography, shapes, and color. Material Symbols are not required for this component.

If the parent page uses the BaxterLabs glass nav or footer, those already have their own component implementations in the codebase (`components/Header.tsx`, `components/Footer.tsx`) — use them as-is.

---

## Files

- `Positioning Map.html` — the HTML prototype (single file). Open it to see the interactive reference.
- `colors_and_type.css` — the BaxterLabs design tokens the prototype consumes (mirror of `src/index.css` @theme block).
- `BaxterLabs_Positioning_Map_v1_1.md` — the canonical positioning narrative (source of all copy, coordinates, and the v1.1 Status-Quo-at-origin correction).
- `README.md` — this file.

---

## Implementation Notes

1. **Tailwind v4 + React**: render as a single `<PositioningMap />` component. Put the two matrix datasets in a module-scoped `MATRICES` constant (or import from a JSON file) — they don't belong in React state.
2. **Plot coordinates**: use `left: {x}%` + `bottom: {y}%` with `transform: translate(-50%, 50%)` on each dot. This anchors dots to the visual bottom of the plot (matching "y=0 is the bottom of the chart") and centers them on their coordinate. Do not use CSS `grid` for dot placement — the percentage approach is simpler and handles the animated halo cleanly.
3. **Label anchoring**: the dot container is `position: relative`. Labels are `position: absolute; top: 50%; transform: translateY(-50%)` and anchor either by `left: 28px` (label extends right) or `right: 28px` (label extends left) — pick per-player via the `labelSide` field in the data to keep every label inside the plot.
4. **Quadrant highlight**: single element `position: absolute; top: 0; right: 0; width: 50%; height: 50%` with gradient bg, dashed borders on only the left + bottom edges, and a triangular corner flag via `::after` (border-trick — see CSS in the prototype).
5. **Pulse halo on BL dot**: keyframe animation is 2.8s `ease-out infinite`. Respect `prefers-reduced-motion` — wrap the halo animation in `@media (prefers-reduced-motion: no-preference)` when porting.
6. **Responsive breakpoints** (from the prototype): `900px` (header stacks), `1000px` (matrix layout stacks). Use Tailwind defaults (`md:` = 768, `lg:` = 1024) — close enough; adjust by a few px if the design QA turns up awkward intermediate widths.
7. **Accessibility**:
   - Tabs: render as `role="tablist"` / `role="tab"` / `role="tabpanel"`. `aria-selected` on the active tab.
   - Dots: give each an `aria-label` like "BaxterLabs Advisory — Upper-Right quadrant" and make the label card visible to screen readers (don't `aria-hidden` it).
   - Quadrant highlight is decorative — `aria-hidden="true"`.
   - The `<em>` in the deck paragraph is intentional emphasis, not italic styling; keep it as `<em>` so assistive tech conveys it.
8. **Do not add**: icons, emoji, photography, gradients outside the one permitted chart quadrant gradient, colored shadows, rounded corners beyond the 2px default, or additional player categories. The brand is deliberately severe.
