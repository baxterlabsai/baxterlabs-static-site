import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import SEO from '../../components/SEO'

interface CalendarEngagement {
  id: string
  status: string
  phase: number
  start_date: string | null
  target_end_date: string | null
  fee: number
  partner_lead: string
  clients: { company_name: string }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DAY_MS = 1000 * 60 * 60 * 24
const DAYS_BEFORE = 30
const DAYS_AFTER = 60
const TOTAL_DAYS = DAYS_BEFORE + DAYS_AFTER

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

function formatDay(d: Date): string {
  return String(d.getDate())
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Which color family does this engagement get? */
function barColor(status: string): { bg: string; text: string } {
  const pending = [
    'intake',
    'nda_pending',
    'nda_signed',
    'discovery_done',
    'agreement_pending',
    'agreement_signed',
    'documents_pending',
    'documents_received',
  ]
  if (pending.includes(status)) return { bg: 'bg-gold', text: 'text-charcoal' }
  if (status === 'phases_complete') return { bg: 'bg-green', text: 'text-white' }
  // phase_0 … phase_7, or anything else active
  return { bg: 'bg-teal', text: 'text-white' }
}

/* ------------------------------------------------------------------ */
/*  Capacity analysis                                                 */
/* ------------------------------------------------------------------ */

interface CapacityAlert {
  date: string
  count: number
}

function findPeakOverlap(
  engagements: CalendarEngagement[],
  windowStart: Date,
  windowEnd: Date,
): CapacityAlert | null {
  let peak: CapacityAlert | null = null

  for (let d = new Date(windowStart); d <= windowEnd; d = addDays(d, 1)) {
    const iso = d.toISOString().split('T')[0]
    let count = 0
    for (const eng of engagements) {
      if (!eng.start_date) continue
      const s = eng.start_date
      const e = eng.target_end_date ?? '9999-12-31'
      if (iso >= s && iso <= e) count++
    }
    if (count > 3 && (!peak || count > peak.count)) {
      peak = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        count,
      }
    }
  }
  return peak
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* title skeleton */}
      <div className="h-8 w-56 bg-gray-light rounded" />
      <div className="h-4 w-80 bg-gray-light rounded" />
      {/* rows */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-6 w-36 bg-gray-light rounded" />
          <div className="h-6 flex-1 bg-gray-light rounded" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
      <svg
        className="mx-auto w-12 h-12 text-gray-warm mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      </svg>
      <p className="text-lg font-semibold text-charcoal mb-1">No active engagements</p>
      <p className="text-gray-warm text-sm">
        Active engagements with dates will appear on the timeline.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile list view                                                  */
/* ------------------------------------------------------------------ */

function MobileListView({
  engagements,
  navigate,
}: {
  engagements: CalendarEngagement[]
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-3 md:hidden">
      {engagements.map(eng => {
        const colors = barColor(eng.status)
        return (
          <button
            key={eng.id}
            onClick={() => navigate(`/dashboard/engagement/${eng.id}`)}
            className="w-full text-left bg-white rounded-lg border border-gray-light p-4 hover:bg-ivory/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-charcoal truncate">
                {eng.clients?.company_name || 'Unknown'}
              </p>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
              >
                {statusLabel(eng.status)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-warm">
              <span>Phase {eng.phase}</span>
              {eng.start_date && (
                <span>
                  {new Date(eng.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' - '}
                  {eng.target_end_date
                    ? new Date(eng.target_end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'TBD'}
                </span>
              )}
              {eng.partner_lead && <span>{eng.partner_lead}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function Calendar() {
  const [engagements, setEngagements] = useState<CalendarEngagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<{ engagements: CalendarEngagement[] }>('/api/engagements/calendar')
      .then(data => setEngagements(data.engagements))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  /* --- Computed date helpers --- */
  const today = useMemo(() => startOfDay(new Date()), [])
  const windowStart = useMemo(() => addDays(today, -DAYS_BEFORE), [today])
  const windowEnd = useMemo(() => addDays(today, DAYS_AFTER), [today])

  /** Dates array for header rendering */
  const dates = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < TOTAL_DAYS; i++) {
      result.push(addDays(windowStart, i))
    }
    return result
  }, [windowStart])

  /** Capacity alert */
  const capacityAlert = useMemo(
    () => findPeakOverlap(engagements, windowStart, windowEnd),
    [engagements, windowStart, windowEnd],
  )

  /** Column width in px per day */
  const COL_W = 28

  /** Scroll to today on first load */
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const todayOffset = DAYS_BEFORE * COL_W - scrollRef.current.clientWidth / 3
      scrollRef.current.scrollLeft = Math.max(0, todayOffset)
    }
  }, [loading])

  /* ---- Render ---- */

  return (
    <div>
      <SEO
        title="Capacity Calendar | BaxterLabs Advisory"
        description="Gantt-style timeline view of all active engagements."
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Capacity Calendar</h1>
        <p className="text-gray-warm text-sm mt-1">
          90-day timeline of active engagements
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {/* Capacity alert */}
      {capacityAlert && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber/15 border border-amber/40">
          <svg
            className="w-5 h-5 text-amber flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm font-medium text-charcoal">
            Capacity Alert: {capacityAlert.count} concurrent engagements on{' '}
            {capacityAlert.date}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Empty */}
      {!loading && engagements.length === 0 && <EmptyState />}

      {/* Mobile list view */}
      {!loading && engagements.length > 0 && (
        <MobileListView engagements={engagements} navigate={navigate} />
      )}

      {/* Desktop Gantt */}
      {!loading && engagements.length > 0 && (
        <div className="hidden md:block bg-white rounded-lg border border-gray-light overflow-hidden">
          <div className="flex">
            {/* Fixed left column — company names */}
            <div className="flex-shrink-0 w-52 border-r border-gray-light z-10 bg-white">
              {/* Header spacer */}
              <div className="h-14 border-b border-gray-light bg-ivory/50 flex items-end px-3 pb-2">
                <span className="text-xs font-semibold text-charcoal">Client</span>
              </div>
              {/* Rows */}
              {engagements.map(eng => (
                <button
                  key={eng.id}
                  onClick={() => navigate(`/dashboard/engagement/${eng.id}`)}
                  className="w-full text-left h-10 flex items-center px-3 border-b border-gray-light hover:bg-ivory/50 transition-colors"
                >
                  <span className="text-sm text-charcoal font-medium truncate">
                    {eng.clients?.company_name || 'Unknown'}
                  </span>
                </button>
              ))}
            </div>

            {/* Scrollable timeline */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div style={{ width: TOTAL_DAYS * COL_W, position: 'relative' }}>
                {/* ---- Date header ---- */}
                <div
                  className="h-14 border-b border-gray-light bg-ivory/50 flex"
                  style={{ width: TOTAL_DAYS * COL_W }}
                >
                  {dates.map((d, i) => {
                    const isFirst = i === 0 || d.getDate() === 1
                    const isMonday = d.getDay() === 1
                    const showDate = isFirst || isMonday || d.getDate() % 5 === 0
                    return (
                      <div
                        key={i}
                        className="flex-shrink-0 flex flex-col justify-end pb-1 border-r border-gray-light/50"
                        style={{ width: COL_W }}
                      >
                        {(isFirst || d.getDate() === 1) && (
                          <span className="text-[10px] text-gray-warm font-semibold px-0.5 leading-tight">
                            {formatMonth(d)}
                          </span>
                        )}
                        {showDate && (
                          <span className="text-[10px] text-gray-warm px-0.5 leading-tight">
                            {formatDay(d)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* ---- Rows ---- */}
                {engagements.map(eng => {
                  const colors = barColor(eng.status)
                  const engStart = eng.start_date
                    ? startOfDay(new Date(eng.start_date))
                    : null
                  const engEnd = eng.target_end_date
                    ? startOfDay(new Date(eng.target_end_date))
                    : null

                  if (!engStart) {
                    // No start date — render empty row
                    return (
                      <div
                        key={eng.id}
                        className="h-10 border-b border-gray-light"
                        style={{ width: TOTAL_DAYS * COL_W }}
                      />
                    )
                  }

                  // Clamp bar within the visible window
                  const barStart = engStart < windowStart ? windowStart : engStart
                  const barEnd = engEnd
                    ? engEnd > windowEnd
                      ? windowEnd
                      : engEnd
                    : addDays(engStart, 30) // default 30-day bar if no end date

                  const offsetDays = daysBetween(windowStart, barStart)
                  const spanDays = Math.max(1, daysBetween(barStart, barEnd))

                  return (
                    <div
                      key={eng.id}
                      className="h-10 border-b border-gray-light relative"
                      style={{ width: TOTAL_DAYS * COL_W }}
                    >
                      <button
                        onClick={() => navigate(`/dashboard/engagement/${eng.id}`)}
                        className={`absolute top-1.5 h-7 rounded ${colors.bg} ${colors.text} text-xs font-medium flex items-center px-2 truncate cursor-pointer hover:opacity-90 transition-opacity shadow-sm`}
                        style={{
                          left: offsetDays * COL_W,
                          width: Math.max(spanDays * COL_W, COL_W),
                        }}
                        title={`${eng.clients?.company_name} — ${statusLabel(eng.status)} (Phase ${eng.phase})`}
                      >
                        <span className="truncate">
                          P{eng.phase}
                          {eng.partner_lead ? ` - ${eng.partner_lead}` : ''}
                        </span>
                      </button>
                    </div>
                  )
                })}

                {/* ---- Today line ---- */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: DAYS_BEFORE * COL_W, width: 2 }}
                >
                  <div className="w-full h-full bg-crimson" />
                  <span
                    className="absolute text-[10px] font-bold text-crimson whitespace-nowrap"
                    style={{ top: 2, left: 4 }}
                  >
                    Today
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
