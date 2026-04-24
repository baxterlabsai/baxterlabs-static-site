/* Shared size-tier data for BaxterLabs size-calibrated interactives.
   Consumed by the homepage Leak Meter + Break-Even Visualizer.
   The pillar page currently duplicates these numbers inline at
   profit-leaks.astro; a future session will migrate it to import here. */

export type TierKey = 'A' | 'B' | 'C'

export interface Tier {
  key: TierKey
  label: string        // e.g. "$10M – $25M" (en dash, display form)
  shortLabel: string   // e.g. "$10-25M" (compact, for meter seg buttons)
  diagnostic: number   // fixed diagnostic price in USD
  floor: number        // floor of the recovery range in USD
  midpoint: number     // arithmetic midpoint of the recovery range in USD
  ratio: number        // floor / diagnostic, rounded (16 / 36 / 80)
  ratePerSecond: number // leak accumulator rate; annualizes to midpoint
}

export const TIERS: Record<TierKey, Tier> = {
  A: { key: 'A', label: '$5M – $10M',  shortLabel: '$5-10M',  diagnostic: 12500, floor: 200000,  midpoint: 450000,   ratio: 16, ratePerSecond: 0.014 },
  B: { key: 'B', label: '$10M – $25M', shortLabel: '$10-25M', diagnostic: 12500, floor: 450000,  midpoint: 975000,   ratio: 36, ratePerSecond: 0.031 },
  C: { key: 'C', label: '$25M – $50M', shortLabel: '$25-50M', diagnostic: 12500, floor: 1000000, midpoint: 2250000,  ratio: 80, ratePerSecond: 0.071 },
}

export const DEFAULT_TIER: TierKey = 'B'

export const TIER_STORAGE_KEY   = 'baxterlabs_leak_tier'
export const METER_EPOCH_KEY    = 'baxterlabs_leak_start'
export const METER_DISMISS_KEY  = 'baxterlabs_leak_dismissed'

export const SECONDS_PER_DAY = 86400

export const TIER_CHANGE_EVENT = 'bl:tierchange'
export const LEAK_TICK_EVENT   = 'bl:leaktick'

export interface LeakTickDetail {
  value: number
  daysToBreakEven: number
  tier: TierKey
}

export function isTierKey(v: unknown): v is TierKey {
  return v === 'A' || v === 'B' || v === 'C'
}

export function getTierFromHash(): TierKey | null {
  if (typeof window === 'undefined') return null
  const m = (window.location.hash || '').match(/tier=([abc])/i)
  if (!m) return null
  const k = m[1].toUpperCase()
  return isTierKey(k) ? k : null
}

export function setTierHash(tier: TierKey): void {
  if (typeof window === 'undefined') return
  const rest = (window.location.hash || '').replace(/#?tier=[abc]/i, '')
  const prefix = rest && rest !== '#' ? rest.replace(/^#?/, '#') + '&' : '#'
  window.history.replaceState(null, '', prefix + 'tier=' + tier.toLowerCase())
}

export function readInitialTier(): TierKey {
  const fromHash = getTierFromHash()
  if (fromHash) return fromHash
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(TIER_STORAGE_KEY)
      if (isTierKey(stored)) return stored
    } catch { /* access denied */ }
  }
  return DEFAULT_TIER
}

export function persistTier(tier: TierKey): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(TIER_STORAGE_KEY, tier) } catch { /* access denied */ }
}
