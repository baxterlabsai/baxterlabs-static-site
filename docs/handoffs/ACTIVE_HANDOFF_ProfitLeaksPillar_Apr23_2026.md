# Handoff: /profit-leaks Pillar Page

**Date:** 2026-04-23
**Author:** Claude Code (phase-gated session with George)
**Status:** Shipped to `feat/profit-leaks-pillar`; open follow-ups tracked below.

---

## Summary

New SEO pillar page live at `/profit-leaks` with two anchor interactives (Fragility Loop covenant-breach simulator, 19-segment $3.585M Decomposition bar) and three supporting calculators (margin erosion, vendor sprawl, revenue-to-payroll). A size-tier selector persists via URL hash (`#tier=a|b|c`, default B) and calibrates nine figures across the page. Copy ported verbatim from the design handoff HTML at `docs/profit-leaks/design_handoff_profit_leaks/design_reference/profit-leaks.html`. Article + BreadcrumbList + Organization JSON-LD emitted via a new `BaseLayout` head slot. `og:type="article"` for this page; other pages continue to default to `"website"`. Profit Leaks inserted as the 2nd nav item (between Home and Services) in both Header and Footer.

**Commit:** `1ec2f40` on `feat/profit-leaks-pillar`, 10 files changed, 2,422 insertions, 2 deletions.

---

## Files Shipped

| File | Type | Notes |
|---|---|---|
| `src/pages/profit-leaks.astro` | new | Page body (all 11 sections inline) + tier `<script is:inline>` + JSON-LD head slot |
| `src/components/profit-leaks/pillar.css` | new | `--pl-*` tokens + `.pl-*` utilities, scoped under `.pl-page` |
| `src/components/profit-leaks/FragilityLoop.tsx` | new | Section 5 anchor; SVG pentagon + 5-node simulator + playback controls |
| `src/components/profit-leaks/DecompositionBar.tsx` | new | Section 6 anchor; 19-segment stacked bar + filters + hover tooltip |
| `src/components/profit-leaks/MarginErosionChart.tsx` | new | Leak 1 inline; scroll-triggered 3-bar chart |
| `src/components/profit-leaks/VendorSprawlCalc.tsx` | new | Leak 3 inline; 2-input form, comma-formatted dollar input |
| `src/components/profit-leaks/RevenuePayrollCalc.tsx` | new | Leak 5 inline; 2-input form, comma-formatted dollar inputs |
| `src/layouts/BaseLayout.astro` | modified | Added `ogType` prop (default `"website"`), `<slot name="head" />`, Playfair Display italic 700 |
| `src/components/Header.astro` | modified | Profit Leaks inserted at index 1 |
| `src/components/Footer.astro` | modified | Profit Leaks inserted at index 1 |

All 5 React islands hydrate with `client:visible`.

---

## Architecture Decisions (for future edits)

- **Tier state is NOT React.** Tier-dependent figures carry `data-tier-*` attributes. An inline vanilla script parses `#tier=a|b|c` from the URL hash, updates `innerHTML` on all tagged elements, and listens for size-button clicks + `hashchange`. No React context, no localStorage. Default is `B`.
- **Copy source of truth is the handoff HTML**, not the brief. When the handoff and brief disagreed on wording, the handoff won (per mid-session direction). Brief remains authoritative for SEO metadata (title, description, JSON-LD shape, canonical) and the size-tier range tables in Section 7.
- **No dev-only Tweaks panel.** The handoff includes a fixed-position editor panel for live tweaking (headline, CTA, tier, motion, palette). Skipped intentionally — designer-preview convenience, not production.
- **Size-selector sticky offset is `top: 6rem`** to clear the site's fixed Header (Header actual height ~91px; `main` has `pt-24` = 96px). If Header height changes materially, adjust in `pillar.css`.
- **Non-ASCII UI glyphs retained:** ▶ (U+25B6) and ❚❚ (U+2759) in the Fragility Loop play button. The ASCII-only rule applies to editorial copy (em dashes, curly quotes, ellipsis), not functional UI affordances.
- **Editorial typography via HTML entities:** en dashes (`&ndash;`), middle dots (`&middot;`), right arrows (`&rarr;`), `&amp;` are preserved throughout. These render as their typographic glyphs but keep source ASCII-clean.

---

## Open Follow-Ups

### a. Canonical consolidation: pillar vs. field guide reader

Add `<link rel="canonical" href="https://baxterlabs.ai/profit-leaks" />` to `/go/five-profit-leaks/read` (and potentially `/resources/five-profit-leaks/read`). Decision pending on which page should hold ranking authority given existing backlinks to the gated reader. The brief recommends the pillar holds canonical authority once it ships; George asked to flag this rather than auto-apply.

**Files that would change when ready:**
- `src/pages/go/five-profit-leaks/read.astro`
- `src/pages/resources/five-profit-leaks/read.astro`
- Likely requires threading a `canonical` override through `GoLayout` / `ResourcesLayout` or into `FieldGuideReader.astro` directly.

### b. Custom og:image PNG

Pillar currently uses `/images/baxterlabs-og.png` as a placeholder. Brief Section 10 specifies a custom share card with dark-dossier palette and headline typography (not a generic logo card). Designer deliverable.

**TODO marker:** `src/pages/profit-leaks.astro` frontmatter, line flagged `// TODO: replace with custom dark-dossier og:image PNG`.

When the asset lands at `/images/profit-leaks-og.png` (or wherever), update the `ogImage` constant and remove the TODO comment.

### c. Size-tier range validation

Tier A/B/C ranges in Section 7 of the brief (and now the live page) were calibrated from the Scion anchor ($52M firm → $3.585M moderate) and scaled proportionally. Brief explicitly flags this: *"George should validate these ranges against the broader BaxterLabs diagnostic book to ensure they reflect observed patterns across the engagement portfolio."*

Current ranges (for reference):

| Tier | Hero stat | Leak 1 | Leak 2 | Leak 3 | Leak 4 | Leak 5 | ROI low |
|---|---|---|---|---|---|---|---|
| A ($5M–$10M) | $200K–$700K | $50K–$200K | $30K–$150K | $30K–$120K | $15K–$60K | $60K–$200K | 16x |
| B ($10M–$25M) | $450K–$1.5M | $150K–$500K | $100K–$400K | $60K–$250K | $30K–$100K | $120K–$450K | 36x |
| C ($25M–$50M) | $1M–$3.5M | $400K–$1.5M | $250K–$800K | $150K–$500K | $60K–$250K | $250K–$850K | 80x |

Ranges live in one place: the `TIER_DATA` object inside the `<script is:inline>` block at the bottom of `src/pages/profit-leaks.astro`. Edit there to recalibrate.

### d. Internal links TO /profit-leaks

Not in scope this session. Pages that should link to the pillar:

- Homepage (`/` — `src/pages/index.astro`)
- `/services` (`src/pages/services.astro`)
- `/about` (`src/pages/about.astro`)
- `/insights` index + future articles in `src/pages/insights/`
- Email signature (outside the repo)
- Self-assessment results page (`src/pages/resources/self-assessment/` or the underlying React island)

Each should get a contextual link, not a blanket nav-style link. Pillar nav is already global.

### e. Field guide / pillar content drift

`/go/five-profit-leaks/read` and `/profit-leaks` cover overlapping material on the five profit-leak categories. Once the canonical decision (follow-up a) is made, audit the two for copy drift and consolidate where reasonable. The field guide reader is authored from `src/data/field-guide.ts` (LEAK_SECTIONS); the pillar is authored inline in `profit-leaks.astro`. A shared source would prevent drift but is not required — periodic sync check is fine.

### f. Ops Manual v2.6.4 stale Render env-var deploy claim

Flagged in recent memory updates, unrelated to this session. Track for the v2.7 refresh. Out of scope for this handoff but listed for completeness per George's Phase 5 request.

---

## Architectural Decisions Not Revisited (locked-in)

For anyone iterating on this page later:

- **One page file, many islands, no content collection.** Pillar copy lives inline in `profit-leaks.astro`. If copy volume grows (additional pillars, variant tiers, locale support), consider extracting to content collection or MDX.
- **Islands are tier-independent.** Tier state only affects static DOM text; interactive components (Fragility Loop, Decomposition, calculators) do not read tier. This keeps React scope minimal. If a future interactive needs tier awareness, a shared store via `nanostores` or equivalent is the cleanest add.
- **Dollar-amount inputs use `type="text" inputMode="numeric"`** with `toLocaleString('en-US')` for thousand separators. Plain integer fields (vendor count) and decimal fields (margin %, rate %, covenant floor x) keep `type="number"`.
- **Build command:** `npm run build` runs `astro check && astro build`. Typecheck-only is `npx tsc -b --noEmit`.

---

## Verification Record (at ship time)

- `npx tsc -b --noEmit`: clean, 0 errors
- `npm run build`: 22 static pages generated, 0 errors, 0 warnings, 3 hints (all pre-existing in `SelfAssessment.tsx`, FormEvent deprecation)
- `/profit-leaks/index.html`: 56,933 bytes, 28,095 chars rendered body text, all SEO tags present (title, meta description, 5 OG tags, canonical), 3 valid JSON-LD blocks (Article, BreadcrumbList, Organization), 0 banned typographic chars, 0 empty hydration shells
- Nav order verified in Header (desktop + mobile) and Footer: Home → **Profit Leaks** → Services → Approach → Resources → About → Insights
- Dev server: serves `/profit-leaks` with HTTP 200 at `http://localhost:4321/profit-leaks`
- Manual browser walkthrough (George): approved; one follow-up was comma formatting on dollar-amount inputs, fixed before commit
