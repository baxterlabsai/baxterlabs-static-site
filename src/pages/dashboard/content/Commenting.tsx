/* ============================================================================
 *  LinkedIn Commenting Opportunities
 *  COWORK WRITE-BACK CONTRACT — Added 2026-04-06 handoff
 *  commenting_opportunities rows written by Cowork "LinkedIn Commenting
 *  Pre-Brief" scheduled task (weekdays) via Supabase MCP (service_role key).
 *  5 rows per weekday, ranked 1-5, UNIQUE(briefing_date, rank).
 *  DO NOT REMOVE — this page is the primary review surface for commenting
 *  opportunities. Status updates via PATCH /api/commenting/{id}.
 *  Layout follows News.tsx card pattern verbatim per handoff spec.
 * ============================================================================ */

import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../../../lib/api'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'

interface CommentingOpp {
  id: string
  briefing_date: string
  rank: number
  profile_name: string
  profile_url: string
  post_summary: string
  relevance_reason: string
  suggested_angle: string
  status: string
  acted_at: string | null
  created_at: string
}

export default function Commenting() {
  const [items, setItems] = useState<CommentingOpp[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showWeek, setShowWeek] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    load()
  }, [showWeek])

  function load() {
    setLoading(true)
    const params = showWeek ? `?date=${today}&days=7` : `?date=${today}`
    apiGet<CommentingOpp[]>(`/api/commenting${params}`)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useRealtimeRefresh('commenting', load, ['commenting_opportunities'])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    try {
      const updated = await apiPatch<CommentingOpp>(`/api/commenting/${id}`, { status })
      setItems(prev => prev.map(o => o.id === id ? updated : o))
    } catch { /* ignore */ }
    setUpdating(null)
  }

  const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Pending', classes: 'bg-gray-100 text-gray-600' },
    acted_on: { label: 'Acted', classes: 'bg-emerald-100 text-emerald-700' },
    skipped: { label: 'Skipped', classes: 'bg-gray-200 text-gray-500' },
    saved: { label: 'Saved', classes: 'bg-blue-100 text-blue-700' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal font-display">Commenting</h1>
          <p className="text-sm text-charcoal/60 mt-1">LinkedIn commenting opportunities — review and act on daily picks</p>
        </div>
        <button
          onClick={() => setShowWeek(!showWeek)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            showWeek
              ? 'border-teal bg-teal/5 text-teal'
              : 'border-gray-200 text-charcoal/60 hover:border-teal hover:text-teal'
          }`}
        >
          {showWeek ? 'Last 7 days' : 'Today only'}
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="w-10 h-10 mx-auto text-charcoal/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <p className="text-sm text-charcoal/40">
              No commenting opportunities {showWeek ? 'this week' : 'today'} — Cowork runs this weekdays
            </p>
          </div>
        ) : (
          items.map(item => {
            const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending
            const isExpanded = expandedId === item.id
            const isNotToday = item.briefing_date !== today

            return (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-5">
                {/* Card header: rank badge + profile name + LinkedIn link */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-crimson/10 text-crimson text-xs font-bold flex items-center justify-center">
                    {item.rank}
                  </span>
                  <h3 className="text-sm font-bold text-charcoal flex-1 min-w-0 truncate">
                    {item.profile_name}
                  </h3>
                  {isNotToday && (
                    <span className="text-[10px] text-charcoal/40 flex-shrink-0">{item.briefing_date}</span>
                  )}
                  <a
                    href={item.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-charcoal/40 hover:text-teal transition-colors"
                    title="Open in LinkedIn"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>

                {/* Card body: post summary + relevance + angle */}
                <div className="ml-9">
                  {/* Post summary (2-line clamp, expandable) */}
                  <p
                    className={`text-sm text-charcoal/70 mb-1.5 cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {item.post_summary}
                  </p>

                  {/* Relevance reason (italic small text) */}
                  <p className="text-xs text-charcoal/40 italic mb-2">
                    {item.relevance_reason}
                  </p>

                  {/* Suggested angle (highlighted block) */}
                  <div className="bg-teal/5 border-l-2 border-teal rounded-r-md px-3 py-2 mb-3">
                    <p className="text-xs text-charcoal/70">
                      <span className="font-semibold text-teal">Angle: </span>
                      {item.suggested_angle}
                    </p>
                  </div>

                  {/* Card footer: status badge + action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
                      {badge.label}
                    </span>

                    {item.status === 'pending' && (
                      <>
                        <button
                          disabled={updating === item.id}
                          onClick={() => updateStatus(item.id, 'acted_on')}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-charcoal/60 hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {updating === item.id ? 'Updating...' : 'Mark Acted'}
                        </button>
                        <button
                          disabled={updating === item.id}
                          onClick={() => updateStatus(item.id, 'skipped')}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-charcoal/60 hover:border-gray-400 hover:text-charcoal transition-colors disabled:opacity-50"
                        >
                          Skip
                        </button>
                        <button
                          disabled={updating === item.id}
                          onClick={() => updateStatus(item.id, 'saved')}
                          className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-charcoal/60 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
