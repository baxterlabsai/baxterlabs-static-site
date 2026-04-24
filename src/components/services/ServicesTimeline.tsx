import { useEffect, useState } from 'react'
import { DAYS, type Day } from '../../data/services-timeline'

// Day 0 is always the first entry; Days 1-14 follow in order.
const DAY_0: Day = DAYS[0]
const DAYS_1_14: Day[] = DAYS.slice(1)

const isEmptyClient = (cl: string) => cl.toLowerCase().startsWith('none')

export default function ServicesTimeline() {
  // Boot on Day 1 to match the handoff's default. Day 0 is reachable by
  // clicking the P0 cell or using ArrowLeft from Day 1.
  const [currentDay, setCurrentDay] = useState<number>(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when focus is on an input/textarea so typing doesn't shift
      // the timeline (there are no form fields on /services today, but
      // the guard keeps the listener safe against future additions).
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      if (e.key === 'ArrowLeft' && currentDay > 0) {
        setCurrentDay((d) => d - 1)
      } else if (e.key === 'ArrowRight' && currentDay < 14) {
        setCurrentDay((d) => d + 1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [currentDay])

  const current = DAYS.find((d) => d.n === currentDay) ?? DAY_0
  const running = currentDay >= 1

  return (
    <div className="sv-tl-wrap">
      <div className="sv-tl-legend" aria-hidden="true">
        <span><i className="sv-tl-swatch bl" /> BaxterLabs Work</span>
        <span><i className="sv-tl-swatch cl" /> Client Involvement</span>
        <span><i className="sv-tl-swatch dl" /> Deliverable Taking Shape</span>
      </div>

      {/* GANTT (desktop) */}
      <div className="sv-tl-rail">
        <div className="sv-tl-scale">
          <button
            className={'p0-cell' + (currentDay === 0 ? ' active' : '')}
            onClick={() => setCurrentDay(0)}
            type="button"
            aria-label="Pre-engagement phase (Day 0)"
          >
            Day&nbsp;0
          </button>
          <div>
            <div className="phases">
              <div className="phase p0">
                <span>Before the clock starts</span>
              </div>
              <div className="phase p1">
                <span>Days 1 – 14 · Clock running</span>
              </div>
            </div>
            <div className="days">
              {DAYS_1_14.map((d) => (
                <button
                  key={d.n}
                  className={currentDay === d.n ? 'active' : ''}
                  onClick={() => setCurrentDay(d.n)}
                  type="button"
                  aria-label={`Day ${d.n} of 14`}
                >
                  {d.n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Track
          label="BaxterLabs"
          caption="Our team working"
          trackClass="bl"
          currentDay={currentDay}
          onSelect={setCurrentDay}
        />
        <Track
          label="Client"
          caption="Your team's time"
          trackClass="cl"
          currentDay={currentDay}
          onSelect={setCurrentDay}
        />
        <Track
          label="Deliverable"
          caption="The artifact taking shape"
          trackClass="dl"
          currentDay={currentDay}
          onSelect={setCurrentDay}
        />
      </div>

      <div className="sv-tl-p0-banner">
        <strong>The 14-day clock does not start until the last interview is complete.</strong>{' '}
        This is so the timeline we promise is a timeline we control.
      </div>

      {/* DETAIL PANEL (desktop) */}
      <div className="sv-tl-detail">
        <div className="sv-tl-detail-head">
          <div className="sv-tl-detail-phase">{current.phase}</div>
          <div className="sv-tl-detail-day">
            {currentDay === 0 ? 'Day 0' : `Day ${currentDay}`}
          </div>
          <div className={'sv-tl-detail-clock' + (running ? ' running' : '')}>
            {current.clock}
          </div>
        </div>
        <div className="sv-tl-detail-tracks">
          <div className="sv-tl-detail-track bl">
            <div className="k">BaxterLabs work</div>
            <p>{current.bl}</p>
          </div>
          <div
            className={
              'sv-tl-detail-track cl' + (isEmptyClient(current.cl) ? ' empty' : '')
            }
          >
            <div className="k">Client involvement</div>
            <p>{current.cl}</p>
          </div>
          <div className="sv-tl-detail-track dl">
            <div className="k">Deliverable taking shape</div>
            <p>{current.dl}</p>
          </div>
        </div>
      </div>

      {/* NAV (desktop) */}
      <div className="sv-tl-nav">
        <button
          className="sv-tl-nav-btn"
          disabled={currentDay <= 0}
          onClick={() => setCurrentDay((d) => Math.max(0, d - 1))}
          type="button"
        >
          ← Previous Day
        </button>
        <span className="sv-tl-nav-hint">
          Click any day on the rail above, or use ←/→ arrow keys.
        </span>
        <button
          className="sv-tl-nav-btn"
          disabled={currentDay >= 14}
          onClick={() => setCurrentDay((d) => Math.min(14, d + 1))}
          type="button"
        >
          Next Day →
        </button>
      </div>

      {/* VERT CARDS (mobile) */}
      <div className="sv-tl-vert">
        {DAYS.map((d) => (
          <article
            key={d.n}
            className={'sv-tl-vert-card' + (d.n === 0 ? ' p0' : '')}
          >
            <div className="d">{d.n === 0 ? 'Day 0' : `Day ${d.n}`}</div>
            <div className="tracks">
              <div className="t bl">
                <span className="k">BaxterLabs</span>
                {d.bl}
              </div>
              <div className={'t cl' + (isEmptyClient(d.cl) ? ' empty' : '')}>
                <span className="k">Client</span>
                {d.cl}
              </div>
              <div className="t dl">
                <span className="k">Deliverable</span>
                {d.dl}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ============ GANTT TRACK ROW ============
type TrackClass = 'bl' | 'cl' | 'dl'
interface TrackProps {
  label: string
  caption: string
  trackClass: TrackClass
  currentDay: number
  onSelect: (n: number) => void
}

function Track({ label, caption, trackClass, currentDay, onSelect }: TrackProps) {
  return (
    <div className="sv-tl-track">
      <div className="sv-tl-track-label">
        {label}
        <em>{caption}</em>
      </div>
      <div className="sv-tl-track-body">
        {/* P0 phase-block (single dashed cell) */}
        <div className="phase-block p0">
          <button
            className={
              'sv-tl-seg p0-fill ' + trackClass + (currentDay === 0 ? ' active' : '')
            }
            onClick={() => onSelect(0)}
            type="button"
            aria-label={`${label}, Day 0`}
          />
        </div>
        {/* Days 1-14 phase-block (14 columns) */}
        <div className="phase-block">
          {DAYS_1_14.map((d) => {
            const intensity = d.bar ? d.bar[trackClass] : 0
            const idle = intensity === 0
            const opacity = 0.35 + intensity * 0.65
            return (
              <button
                key={d.n}
                className={
                  'sv-tl-seg ' +
                  trackClass +
                  (idle ? ' idle' : ' has-work') +
                  (currentDay === d.n ? ' active' : '')
                }
                style={{ opacity }}
                onClick={() => onSelect(d.n)}
                type="button"
                aria-label={`${label}, Day ${d.n}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
