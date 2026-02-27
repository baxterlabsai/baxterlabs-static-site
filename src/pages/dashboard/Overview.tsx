import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiGet } from '../../lib/api'

interface Engagement {
  id: string
  status: string
  phase: number
  fee: number | null
  start_date: string | null
  target_end_date: string | null
  created_at: string
  clients: {
    company_name: string
    primary_contact_name: string
  }
}

interface PipelineStats {
  stage_counts: Record<string, number>
  total_pipeline_value: number
  total_opportunities: number
  tasks_due_today: number
  tasks_overdue: number
  recent_activities: Array<{
    id: string
    type: string
    subject: string
    occurred_at: string
    pipeline_contacts: { id: string; name: string } | null
    pipeline_companies: { id: string; name: string } | null
  }>
}

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-gray-light text-charcoal',
  nda_pending: 'bg-gray-light text-charcoal',
  nda_signed: 'bg-blue-100 text-blue-800',
  discovery_done: 'bg-blue-100 text-blue-800',
  agreement_pending: 'bg-amber/20 text-amber',
  agreement_signed: 'bg-amber/20 text-amber',
  documents_pending: 'bg-orange-100 text-orange-800',
  documents_received: 'bg-orange-100 text-orange-800',
  phase_1: 'bg-green/10 text-green',
  phase_2: 'bg-green/10 text-green',
  phase_3: 'bg-green/10 text-green',
  phase_4: 'bg-green/10 text-green',
  phase_5: 'bg-green/10 text-green',
  phase_6: 'bg-green/10 text-green',
  debrief: 'bg-purple-100 text-purple-800',
  wave_1_released: 'bg-purple-100 text-purple-800',
  wave_2_released: 'bg-purple-100 text-purple-800',
  closed: 'bg-charcoal/10 text-charcoal',
}

const STAGE_BADGE_COLORS: Record<string, string> = {
  identified: 'bg-gray-light text-charcoal',
  contacted: 'bg-blue-100 text-blue-800',
  discovery_scheduled: 'bg-teal/10 text-teal',
  discovery_complete: 'bg-teal/20 text-teal',
  proposal_sent: 'bg-gold/20 text-charcoal',
  negotiation: 'bg-gold/30 text-charcoal',
  won: 'bg-green/10 text-green',
}

const STAGE_LABELS: Record<string, string> = {
  identified: 'Identified',
  contacted: 'Contacted',
  discovery_scheduled: 'Discovery',
  discovery_complete: 'Disc. Complete',
  proposal_sent: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
}

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  video_call: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  phone_call: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  dm: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  linkedin: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  meeting: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772',
  note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  referral: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function daysRemaining(endDate: string | null): string {
  if (!endDate) return '—'
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Overdue'
  return `${diff}d`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

type SortField = 'company' | 'status' | 'phase' | 'fee' | 'created'
type SortDir = 'asc' | 'desc'

export default function Overview() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      apiGet<{ engagements: Engagement[] }>('/api/engagements'),
      apiGet<PipelineStats>('/api/pipeline/stats').catch(() => null),
    ])
      .then(([engData, statsData]) => {
        setEngagements(engData.engagements)
        if (statsData) setPipelineStats(statsData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...engagements].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'company': return dir * (a.clients?.company_name || '').localeCompare(b.clients?.company_name || '')
      case 'status': return dir * a.status.localeCompare(b.status)
      case 'phase': return dir * (a.phase - b.phase)
      case 'fee': return dir * ((a.fee || 0) - (b.fee || 0))
      case 'created': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default: return 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-gray-warm/50">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      {/* Pipeline Snapshot */}
      {pipelineStats && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal">Pipeline</h2>
            <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline flex items-center gap-1">
              View Board
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-light p-5">
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-warm">Pipeline Value</p>
                <p className="text-lg font-bold text-charcoal">
                  ${pipelineStats.total_pipeline_value.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Opportunities</p>
                <p className="text-lg font-bold text-charcoal">{pipelineStats.total_opportunities}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Tasks Due Today</p>
                <p className="text-lg font-bold text-charcoal">{pipelineStats.tasks_due_today}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Overdue Tasks</p>
                <p className={`text-lg font-bold ${pipelineStats.tasks_overdue > 0 ? 'text-red-soft' : 'text-charcoal'}`}>
                  {pipelineStats.tasks_overdue}
                  {pipelineStats.tasks_overdue > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-soft" />
                  )}
                </p>
              </div>
            </div>

            {/* Stage pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const count = pipelineStats.stage_counts[key] || 0
                return (
                  <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_BADGE_COLORS[key] || 'bg-gray-light text-charcoal'}`}>
                    {label}: {count}
                  </span>
                )
              })}
            </div>

            {/* Recent activities mini-feed */}
            {pipelineStats.recent_activities.length > 0 && (
              <div className="border-t border-gray-light pt-3">
                <p className="text-xs font-semibold text-gray-warm mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {pipelineStats.recent_activities.slice(0, 5).map(act => (
                    <div key={act.id} className="flex items-start gap-2 text-xs">
                      <svg className="w-4 h-4 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <span className="text-charcoal font-medium">{act.subject}</span>
                        {act.pipeline_contacts?.name && (
                          <span className="text-gray-warm"> — {act.pipeline_contacts.name}</span>
                        )}
                      </div>
                      <span className="text-gray-warm flex-shrink-0">{timeAgo(act.occurred_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engagements */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Engagements</h1>
        <p className="text-gray-warm text-sm mt-1">All active and past engagements</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {engagements.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">No engagements yet</p>
          <p className="text-gray-warm text-sm">New intakes will appear here automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-light bg-ivory/50">
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('company')}>
                    Client<SortIcon field="company" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status<SortIcon field="status" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('phase')}>
                    Phase<SortIcon field="phase" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal hidden md:table-cell">Days Left</th>
                  <th className="text-right px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('fee')}>
                    Fee<SortIcon field="fee" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(eng => (
                  <tr
                    key={eng.id}
                    onClick={() => navigate(`/dashboard/engagement/${eng.id}`)}
                    className="border-b border-gray-light last:border-0 hover:bg-ivory/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-charcoal">{eng.clients?.company_name || '—'}</p>
                      <p className="text-gray-warm text-xs">{eng.clients?.primary_contact_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[eng.status] || 'bg-gray-light text-charcoal'}`}>
                        {statusLabel(eng.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal">{eng.phase || '—'}</td>
                    <td className="px-4 py-3 text-charcoal hidden md:table-cell">{daysRemaining(eng.target_end_date)}</td>
                    <td className="px-4 py-3 text-right text-charcoal font-medium">
                      {eng.fee ? `$${eng.fee.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
