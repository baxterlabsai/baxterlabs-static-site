import { useEffect, useRef, useState } from 'react'
import {
  TIERS,
  DEFAULT_TIER,
  TIER_CHANGE_EVENT,
  LEAK_TICK_EVENT,
  METER_EPOCH_KEY,
  METER_DISMISS_KEY,
  SECONDS_PER_DAY,
  readInitialTier,
  persistTier,
  setTierHash,
  isTierKey,
  type TierKey,
  type LeakTickDetail,
} from '../../data/tiers'

/* ============================================================
   LeakMeter — pinned interactive on the homepage.

   localStorage keys (all first-party, client-only):

   baxterlabs_leak_start     Unix ms of the visitor's very first
                             arrival. Written once; never touched
                             by meter interactions. Returning
                             visitors see (now - start) * tier
                             rate, which is why a 3-week-old
                             epoch renders a large number. Only a
                             browser site-data wipe resets it.

   baxterlabs_leak_tier      'A' | 'B' | 'C'. Written on every
                             tier-toggle click, in either island.
                             Defaults to 'B' when absent. URL
                             hash #tier=a|b|c takes precedence
                             on initial load (enables sharing).

   baxterlabs_leak_dismissed '1' when the meter is collapsed to
                             the side tab; removed on re-expand.
                             Persisted across sessions so a
                             visitor who dismissed once doesn't
                             see the meter pop back the next day.
   ============================================================ */

const fmtUSD = (n: number) => '$' + Math.floor(n).toLocaleString('en-US')

export default function LeakMeter() {
  // Start with DEFAULT_TIER to keep SSR and client initial render identical;
  // a mount-phase effect (below) swaps in the real tier from hash/localStorage.
  const [tier, setTier] = useState<TierKey>(DEFAULT_TIER)
  const [value, setValue] = useState(0)
  const [daysSinceStart, setDaysSinceStart] = useState(0)
  const [mountedToView, setMountedToView] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const epochRef = useRef<number | null>(null)

  // Mount phase: resolve real tier, init epoch, restore dismiss state.
  useEffect(() => {
    const initial = readInitialTier()
    if (initial !== tier) setTier(initial)

    try {
      const storedEpoch = window.localStorage.getItem(METER_EPOCH_KEY)
      if (storedEpoch) {
        const n = parseInt(storedEpoch, 10)
        if (Number.isFinite(n)) epochRef.current = n
      }
    } catch {
      /* localStorage access denied */
    }
    if (!epochRef.current) {
      epochRef.current = Date.now()
      try {
        window.localStorage.setItem(METER_EPOCH_KEY, String(epochRef.current))
      } catch {
        /* localStorage access denied */
      }
    }

    try {
      if (window.localStorage.getItem(METER_DISMISS_KEY) === '1') {
        setDismissed(true)
      }
    } catch {
      /* localStorage access denied */
    }
    // tier is read at mount-time only (initial resolution); effect runs once by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll-gated visibility — matches handoff's 40%-viewport threshold.
  useEffect(() => {
    if (mountedToView) return
    const check = () => {
      if (window.scrollY > window.innerHeight * 0.4) setMountedToView(true)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [mountedToView])

  // Tick 4x/sec: accumulate leak, update state, emit LEAK_TICK_EVENT so
  // the Final CTA's static <span>s can update without rehydrating.
  useEffect(() => {
    const tick = () => {
      const epoch = epochRef.current
      if (!epoch) return
      const elapsedSec = (Date.now() - epoch) / 1000
      const v = elapsedSec * TIERS[tier].ratePerSecond
      setValue(v)
      setDaysSinceStart(Math.floor(elapsedSec / SECONDS_PER_DAY))

      const dailyRate = TIERS[tier].ratePerSecond * SECONDS_PER_DAY
      const daysToBreakEven = Math.round(
        TIERS[tier].diagnostic / Math.max(0.01, dailyRate),
      )
      const detail: LeakTickDetail = { value: v, daysToBreakEven, tier }
      window.dispatchEvent(new CustomEvent<LeakTickDetail>(LEAK_TICK_EVENT, { detail }))
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [tier])

  // Cross-island tier sync: listen for the Break-Even Visualizer (or a
  // hashchange from URL navigation) and mirror without re-dispatching.
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

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(METER_DISMISS_KEY, '1')
    } catch {
      /* localStorage access denied */
    }
  }

  const restore = () => {
    setDismissed(false)
    try {
      window.localStorage.removeItem(METER_DISMISS_KEY)
    } catch {
      /* localStorage access denied */
    }
  }

  const showFirstVisit = value >= 1000 && daysSinceStart >= 1

  if (dismissed) {
    return (
      <button
        type="button"
        className={`bl-leak-meter-tab${mountedToView ? ' visible' : ''}`}
        onClick={restore}
        aria-label="Show Leak Meter"
      >
        Show Leak Meter
        <span className="bl-leak-meter-tab-tip">Stored in your browser only</span>
      </button>
    )
  }

  return (
    <aside
      className={`bl-leak-meter${mountedToView ? ' visible' : ''}`}
      aria-live="polite"
      aria-label="Leak Meter, illustrative"
    >
      <div className="bl-leak-meter-head">
        <span className="bl-leak-meter-label">Leak Meter · Illustrative</span>
        <button
          type="button"
          className="bl-leak-meter-dismiss"
          onClick={dismiss}
          aria-label="Dismiss meter"
        >
          ✕
        </button>
      </div>
      <div className="bl-leak-meter-num">{fmtUSD(value)}</div>
      <div className="bl-leak-meter-sub">
        Since you first visited, at {TIERS[tier].label} firm size
      </div>
      {showFirstVisit && (
        <div className="bl-leak-meter-firstvisit">
          Your first visit was {daysSinceStart} day{daysSinceStart === 1 ? '' : 's'} ago.
        </div>
      )}
      <div className="bl-leak-meter-seg" role="radiogroup" aria-label="Firm size tier">
        {(['A', 'B', 'C'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={t === tier}
            className={t === tier ? 'active' : ''}
            onClick={() => handleTierClick(t)}
          >
            {TIERS[t].shortLabel}
          </button>
        ))}
      </div>
      <div className="bl-leak-meter-disclaim">
        Derived from typical recovery patterns at firms your size, not a
        measurement of your firm.
      </div>
    </aside>
  )
}
