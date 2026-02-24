import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../../lib/api'
import SEO from '../../components/SEO'

interface Engagement {
  id: string
  status: string
  phase: number
  fee: number
  start_date: string | null
  target_end_date: string | null
  created_at: string
}

interface Client {
  id: string
  company_name: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  industry: string
  revenue_range: string
  employee_count: string
  website_url: string
  created_at: string
  engagements: Engagement[]
}

type SortDir = 'asc' | 'desc'

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6', 'discovery_done', 'documents_received'].includes(s)) {
    return 'bg-teal/10 text-teal'
  }
  if (['intake', 'nda_pending', 'agreement_pending', 'documents_pending'].includes(s)) {
    return 'bg-gold/15 text-gold'
  }
  if (['closed'].includes(s)) {
    return 'bg-crimson/10 text-crimson'
  }
  return 'bg-charcoal/10 text-charcoal'
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Skeleton ---

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b border-gray-light bg-ivory/50 px-4 py-3 flex gap-4">
        {[120, 100, 80, 90, 60, 80].map((w, i) => (
          <div key={i} className="h-4 bg-gray-light rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 6 }).map((_, row) => (
        <div key={row} className="border-b border-gray-light last:border-0 px-4 py-4 flex gap-4 items-center">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-light rounded animate-pulse w-36" />
            <div className="h-3 bg-gray-light rounded animate-pulse w-24" />
          </div>
          <div className="h-4 bg-gray-light rounded animate-pulse w-28 hidden md:block" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-20 hidden md:block" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-24 hidden md:block" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-10 hidden md:block" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-20 hidden md:block" />
        </div>
      ))}
    </div>
  )
}

// --- Mobile card skeleton ---

function CardSkeleton() {
  return (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-light p-4 space-y-3">
          <div className="h-5 bg-gray-light rounded animate-pulse w-40" />
          <div className="h-3 bg-gray-light rounded animate-pulse w-28" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-light rounded animate-pulse w-20" />
            <div className="h-3 bg-gray-light rounded animate-pulse w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Empty state ---

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
      <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
      <p className="text-lg font-semibold text-charcoal mb-1">
        {hasSearch ? 'No clients found' : 'No clients yet'}
      </p>
      <p className="text-gray-warm text-sm">
        {hasSearch
          ? 'Try adjusting your search terms.'
          : 'Clients will appear here once intake forms are submitted.'}
      </p>
    </div>
  )
}

// --- Engagement row inside expanded client ---

function EngagementRow({ eng }: { eng: Engagement }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 px-4 text-sm border-b border-gray-light/50 last:border-0">
      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(eng.status)}`}>
        {statusLabel(eng.status)}
      </span>
      <span className="text-charcoal">Phase {eng.phase}</span>
      {eng.fee > 0 && (
        <span className="text-charcoal font-medium">${eng.fee.toLocaleString()}</span>
      )}
      {eng.start_date && (
        <span className="text-gray-warm text-xs">Started {formatDate(eng.start_date)}</span>
      )}
      {eng.target_end_date && (
        <span className="text-gray-warm text-xs">Target {formatDate(eng.target_end_date)}</span>
      )}
      <span className="text-gray-warm text-xs ml-auto">Created {formatDate(eng.created_at)}</span>
    </div>
  )
}

// --- Main component ---

export default function ClientDirectory() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const path = searchQuery
        ? `/api/clients?search=${encodeURIComponent(searchQuery)}`
        : '/api/clients'
      const data = await apiGet<{ clients: Client[] }>(path)
      setClients(data.clients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Client-side sort by company name
  const sorted = [...clients].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    return dir * (a.company_name || '').localeCompare(b.company_name || '')
  })

  const toggleSort = () => {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc')
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div>
      <SEO title="Clients | BaxterLabs Advisory" description="Client directory for BaxterLabs Advisory partners." />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Clients</h1>
        <p className="text-gray-warm text-sm mt-1">Client directory and engagement history</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by company or contact name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-light rounded-lg text-sm text-charcoal placeholder:text-gray-warm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-warm hover:text-charcoal transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <>
          <div className="hidden md:block">
            <TableSkeleton />
          </div>
          <CardSkeleton />
        </>
      )}

      {/* Empty */}
      {!loading && !error && clients.length === 0 && (
        <EmptyState hasSearch={searchQuery.length > 0} />
      )}

      {/* Table — desktop */}
      {!loading && clients.length > 0 && (
        <div className="hidden md:block">
          <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-light bg-ivory/50">
                    <th
                      className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none"
                      onClick={toggleSort}
                    >
                      Company Name
                      <span className="ml-1 text-gray-warm/50">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Primary Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Industry</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Revenue Range</th>
                    <th className="text-center px-4 py-3 font-semibold text-charcoal">Engagements</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(client => (
                    <ClientTableRow
                      key={client.id}
                      client={client}
                      isExpanded={expandedId === client.id}
                      onToggle={() => toggleExpand(client.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cards — mobile */}
      {!loading && clients.length > 0 && (
        <div className="md:hidden space-y-4">
          {sorted.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              isExpanded={expandedId === client.id}
              onToggle={() => toggleExpand(client.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Table row (desktop) ---

function ClientTableRow({
  client,
  isExpanded,
  onToggle,
}: {
  client: Client
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-light last:border-0 hover:bg-ivory/50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-warm transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-semibold text-charcoal">{client.company_name || '—'}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-charcoal">{client.primary_contact_name || '—'}</p>
          <p className="text-gray-warm text-xs">{client.primary_contact_email}</p>
        </td>
        <td className="px-4 py-3 text-charcoal">{client.industry || '—'}</td>
        <td className="px-4 py-3 text-charcoal">{client.revenue_range || '—'}</td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal text-xs font-semibold">
            {client.engagements?.length || 0}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-warm text-xs">{formatDate(client.created_at)}</td>
      </tr>
      {isExpanded && client.engagements && client.engagements.length > 0 && (
        <tr>
          <td colSpan={6} className="bg-ivory/30 px-4 py-2">
            <div className="ml-6 border-l-2 border-teal/20 pl-4">
              <p className="text-xs font-semibold text-gray-warm uppercase tracking-wide mb-2">Engagement History</p>
              {client.engagements.map(eng => (
                <EngagementRow key={eng.id} eng={eng} />
              ))}
            </div>
          </td>
        </tr>
      )}
      {isExpanded && (!client.engagements || client.engagements.length === 0) && (
        <tr>
          <td colSpan={6} className="bg-ivory/30 px-4 py-4">
            <p className="text-gray-warm text-sm text-center ml-6">No engagements for this client.</p>
          </td>
        </tr>
      )}
    </>
  )
}

// --- Card (mobile) ---

function ClientCard({
  client,
  isExpanded,
  onToggle,
}: {
  client: Client
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-ivory/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className={`w-4 h-4 text-gray-warm transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <h3 className="font-semibold text-charcoal truncate">{client.company_name || '—'}</h3>
            </div>
            <p className="text-sm text-charcoal ml-6">{client.primary_contact_name || '—'}</p>
            <p className="text-xs text-gray-warm ml-6">{client.primary_contact_email}</p>
          </div>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal text-xs font-semibold flex-shrink-0">
            {client.engagements?.length || 0}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 ml-6 text-xs text-gray-warm">
          {client.industry && <span>{client.industry}</span>}
          {client.revenue_range && <span>{client.revenue_range}</span>}
          <span>{formatDate(client.created_at)}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-light bg-ivory/30 px-4 py-3">
          {client.engagements && client.engagements.length > 0 ? (
            <div className="border-l-2 border-teal/20 pl-3">
              <p className="text-xs font-semibold text-gray-warm uppercase tracking-wide mb-2">Engagement History</p>
              {client.engagements.map(eng => (
                <EngagementRow key={eng.id} eng={eng} />
              ))}
            </div>
          ) : (
            <p className="text-gray-warm text-sm text-center">No engagements for this client.</p>
          )}
        </div>
      )}
    </div>
  )
}
