import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function daysRemaining(endDate: string | null): string {
  if (!endDate) return '—'
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Overdue'
  return `${diff}d`
}

type SortField = 'company' | 'status' | 'phase' | 'fee' | 'created'
type SortDir = 'asc' | 'desc'

export default function Overview() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const navigate = useNavigate()

  useEffect(() => {
    apiGet<{ engagements: Engagement[] }>('/api/engagements')
      .then(data => setEngagements(data.engagements))
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
