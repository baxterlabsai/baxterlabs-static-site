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

export default function BreakEvenVisualizer() {
  // Hydration-safe seed — the mount effect below swaps in the real tier.
  const [tier, setTier] = useState<TierKey>(DEFAULT_TIER)
  const [ratioVisible, setRatioVisible] = useState(true)
  const firstRunRef = useRef(true)

  // Mount phase: resolve real tier from URL hash / localStorage.
  useEffect(() => {
    const initial = readInitialTier()
    if (initial !== tier) setTier(initial)
    // first-run flip suppresses the tier-change fade on initial hydration
    // tier is read at mount-time only; effect runs once by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ratio-figure fade-out/fade-in on tier change (matches handoff: 200ms).
  // Bar widths update instantly; CSS transition handles their smoothing.
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    setRatioVisible(false)
    const id = window.setTimeout(() => setRatioVisible(true), 200)
    return () => window.clearTimeout(id)
  }, [tier])

  // Cross-island tier sync: mirror tier changes from the Leak Meter
  // (or a URL hash bookmark) without re-dispatching.
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

  const handleTierClick = (next: TierKey) => {
    if (next === tier) return
    setTier(next)
    persistTier(next)
    setTierHash(next)
    window.dispatchEvent(new CustomEvent(TIER_CHANGE_EVENT, { detail: next }))
  }

  const T = TIERS[tier]
  const maxVal = T.midpoint
  const pct = (v: number) => Math.max(2, (v / maxVal) * 100)

  return (
    <div className="hp-be-wrap">
      <div className="hp-be-tier-rail">
        <span className="lbl">Calibrate to firm size</span>
        <div className="hp-be-tier-seg" role="radiogroup" aria-label="Firm size tier">
          {(['A', 'B', 'C'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === tier}
              className={`hp-be-tier-btn${k === tier ? ' active' : ''}`}
              onClick={() => handleTierClick(k)}
            >
              {TIERS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="hp-be-grid">
        <div className="hp-be-bars">
          <BarRow
            label="Diagnostic cost · fixed"
            value={fmtUSD(T.diagnostic)}
            fillClass="cost"
            width={pct(T.diagnostic)}
          />
          <BarRow
            label="Typical floor recovery"
            value={fmtUSD(T.floor)}
            fillClass="floor"
            width={pct(T.floor)}
          />
          <BarRow
            label="Typical midpoint recovery"
            value={fmtUSD(T.midpoint)}
            fillClass="mid"
            width={100}
          />
        </div>

        <div className="hp-be-ratio">
          <div
            className="hp-be-ratio-fig"
            style={{ opacity: ratioVisible ? 1 : 0 }}
          >
            {T.ratio}x
          </div>
          <div className="hp-be-ratio-lbl">
            return at the floor
            <br />
            of the recovery range
          </div>
        </div>
      </div>

      <p className="hp-be-disclaim">
        Recovery ranges calibrated from BaxterLabs diagnostic patterns. Your
        firm's finding will vary based on the mix of leaks present.
      </p>
    </div>
  )
}

interface BarRowProps {
  label: string
  value: string
  fillClass: 'cost' | 'floor' | 'mid'
  width: number
}

function BarRow({ label, value, fillClass, width }: BarRowProps) {
  return (
    <div className="hp-be-bar-row">
      <div className="hp-be-bar-label">
        <span>{label}</span>
        <span className="v">{value}</span>
      </div>
      <div className="hp-be-bar-track">
        <div
          className={`hp-be-bar-fill ${fillClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
