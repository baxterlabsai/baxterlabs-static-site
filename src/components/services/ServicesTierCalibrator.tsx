import { useEffect, useRef, useState } from 'react'
import {
  TIERS,
  DEFAULT_TIER,
  TIER_CHANGE_EVENT,
  readInitialTier,
  persistTier,
  setTierHash,
  isTierKey,
  type TierKey,
} from '../../data/tiers'

const fmtUSD = (n: number) => '$' + Math.floor(n).toLocaleString('en-US')

export default function ServicesTierCalibrator() {
  // Hydration-safe seed — the mount effect swaps in the real tier from
  // URL hash / localStorage. This keeps SSR markup deterministic.
  const [tier, setTier] = useState<TierKey>(DEFAULT_TIER)
  const [ratioVisible, setRatioVisible] = useState(true)
  const firstRunRef = useRef(true)

  useEffect(() => {
    const initial = readInitialTier()
    if (initial !== tier) setTier(initial)
    // read-once on mount; intentional empty dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ratio fade-out/in on tier change (matches handoff: 200ms).
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    setRatioVisible(false)
    const id = window.setTimeout(() => setRatioVisible(true), 200)
    return () => window.clearTimeout(id)
  }, [tier])

  // Cross-island sync: mirror tier changes from the Leak Meter / hash
  // without re-dispatching (the setTier here is silent on tier state).
  useEffect(() => {
    const onTierChange = (e: Event) => {
      const next = (e as CustomEvent).detail
      if (isTierKey(next) && next !== tier) setTier(next)
    }
    const onHashChange = () => {
      const m = (window.location.hash || '').match(/tier=([abc])/i)
      if (!m) return
      const k = m[1].toUpperCase()
      if (isTierKey(k) && k !== tier) setTier(k)
    }
    window.addEventListener(TIER_CHANGE_EVENT, onTierChange)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener(TIER_CHANGE_EVENT, onTierChange)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [tier])

  const t = TIERS[tier]
  const max = t.midpoint
  const pct = (v: number) => Math.max(2, (v / max) * 100)

  const selectTier = (next: TierKey) => {
    if (next === tier) return
    setTier(next)
    persistTier(next)
    setTierHash(next)
    window.dispatchEvent(new CustomEvent(TIER_CHANGE_EVENT, { detail: next }))
  }

  return (
    <div className="sv-be-wrap">
      <div
        className="sv-be-tier-rail"
        role="radiogroup"
        aria-label="Firm size tier"
      >
        <span className="lbl">Your firm size</span>
        <div className="sv-be-tier-seg">
          {(Object.keys(TIERS) as TierKey[]).map((k) => (
            <button
              key={k}
              className={'sv-be-tier-btn' + (k === tier ? ' active' : '')}
              data-tier={k}
              role="radio"
              aria-checked={k === tier}
              onClick={() => selectTier(k)}
              type="button"
            >
              {TIERS[k].label}
            </button>
          ))}
        </div>
        <span className="lbl italic">Synced with the homepage Leak Meter</span>
      </div>

      <div className="sv-be-grid">
        <div className="sv-be-bars">
          <div className="sv-be-bar-row">
            <div className="sv-be-bar-label">
              <span>Diagnostic cost · fixed</span>
              <span className="v">{fmtUSD(t.diagnostic)}</span>
            </div>
            <div className="sv-be-bar-track">
              <div
                className="sv-be-bar-fill cost"
                style={{ width: pct(t.diagnostic) + '%' }}
              />
            </div>
          </div>
          <div className="sv-be-bar-row">
            <div className="sv-be-bar-label">
              <span>Typical floor recovery</span>
              <span className="v">{fmtUSD(t.floor)}</span>
            </div>
            <div className="sv-be-bar-track">
              <div
                className="sv-be-bar-fill floor"
                style={{ width: pct(t.floor) + '%' }}
              />
            </div>
          </div>
          <div className="sv-be-bar-row">
            <div className="sv-be-bar-label">
              <span>Typical midpoint recovery</span>
              <span className="v">{fmtUSD(t.midpoint)}</span>
            </div>
            <div className="sv-be-bar-track">
              <div
                className="sv-be-bar-fill mid"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div className="sv-be-ratio">
          <div
            className="sv-be-ratio-fig"
            style={{ opacity: ratioVisible ? 1 : 0 }}
          >
            {t.ratio}x
          </div>
          <div className="sv-be-ratio-lbl">
            Floor return on a $12,500 diagnostic
          </div>
        </div>
      </div>
    </div>
  )
}
