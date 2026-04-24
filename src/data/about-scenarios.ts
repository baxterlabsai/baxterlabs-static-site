/* Scenario Matcher data for /about.
   Consumed by src/components/about/ScenarioMatcher.tsx.

   Each scenario corresponds to one tappable chip. Clicking a chip
   scroll-lands on the first target and highlights all targets in
   the partner bio(s). Target ids are bio paragraph anchors written
   directly on the <p> tags in src/pages/about.astro — the literal
   strings below must match those ids exactly. */

export type Partner = 'George' | 'Alfonso' | 'Both'

export interface Scenario {
  id: string           // chip identifier (also data-target for stable DOM hooks)
  label: string        // chip text (final copy; do not rewrite)
  partner: Partner     // drives the default pointer line when pointerMessage is absent
  targets: string[]    // bio paragraph ids to highlight (first one is scroll target)
  pointerMessage?: string // firm-voice partnership explanation for 'Both' chips
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'both-margin',
    label: 'Margin compressing, cause unclear',
    partner: 'Both',
    targets: ['george-p4', 'alfonso-p1'],
    pointerMessage:
      "Margin compression shows up across both partners' diagnostic work. George found $8M in annual savings at one firm through billing gaps and margin leakage. Alfonso managed forecast gaps and margin pressures at $3B ARR scale. Both see this pattern constantly.",
  },
  {
    id: 'george-p1',
    label: 'Multi-office or multi-state operations',
    partner: 'George',
    targets: ['george-p1'],
  },
  {
    id: 'george-acquisition',
    label: 'Post-acquisition integration unfinished',
    partner: 'George',
    targets: ['george-p3'],
  },
  {
    id: 'george-p2',
    label: 'Founder-led model hitting a ceiling',
    partner: 'George',
    targets: ['george-p2'],
  },
  {
    id: 'alfonso-p3',
    label: "Pricing drifted, no one's enforced the rate card",
    partner: 'Alfonso',
    targets: ['alfonso-p3'],
  },
  {
    id: 'george-p5',
    label: 'Month-end close too slow to act on',
    partner: 'George',
    targets: ['george-p5'],
  },
  {
    id: 'alfonso-p1',
    label: 'Working capital tightening, covenant pressure',
    partner: 'Alfonso',
    targets: ['alfonso-p1'],
  },
  {
    id: 'both-scaling',
    label: 'Scaling finance infrastructure past the founder era',
    partner: 'Both',
    targets: ['george-p2', 'alfonso-p5'],
    pointerMessage:
      'Both partners. George built finance infrastructure inside growth-stage firms. Alfonso built it at enterprise scale. The partnership covers the full arc from founder-led to institutionalized finance.',
  },
]
