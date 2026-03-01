import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, apiPut } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
  industry: string | null
}

interface Contact {
  id: string
  name: string
  title: string | null
  company_id: string | null
}

interface Opportunity {
  id: string
  title: string
  stage: string
  pipeline_companies: { id: string; name: string } | null
}

interface Activity {
  id: string
  contact_id: string | null
  opportunity_id: string | null
  company_id: string | null
  type: string
  subject: string
  body: string | null
  occurred_at: string
  duration_minutes: number | null
  outcome: string | null
  next_action: string | null
  next_action_date: string | null
  gemini_raw_notes: string | null
  plugin_source: string | null
  created_at: string
  created_by: string | null
  pipeline_contacts: { id: string; name: string; email?: string } | null
  pipeline_companies: { id: string; name: string } | null
  pipeline_opportunities: { id: string; title: string } | null
}

interface ParsedResult {
  activity: Activity
  task_created: { id: string; title: string; due_date: string | null } | null
  parsed_fields: {
    subject: string
    body: string | null
    outcome: string | null
    next_action: string | null
    next_action_date: string | null
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_TYPES = [
  { key: 'video_call', label: 'Video Call', color: 'bg-teal/10 text-teal', borderColor: 'border-l-teal' },
  { key: 'phone_call', label: 'Phone Call', color: 'bg-blue-100 text-blue-800', borderColor: 'border-l-blue-500' },
  { key: 'email', label: 'Email', color: 'bg-crimson/10 text-crimson', borderColor: 'border-l-crimson' },
  { key: 'dm', label: 'DM', color: 'bg-gold/20 text-charcoal', borderColor: 'border-l-gold' },
  { key: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-800', borderColor: 'border-l-blue-600' },
  { key: 'meeting', label: 'Meeting', color: 'bg-green/10 text-green', borderColor: 'border-l-green' },
  { key: 'note', label: 'Note', color: 'bg-gray-light text-charcoal', borderColor: 'border-l-gray-warm' },
  { key: 'referral', label: 'Referral', color: 'bg-gold/20 text-charcoal', borderColor: 'border-l-gold' },
  { key: 'plugin_research', label: 'Plugin: Research', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-purple-500' },
  { key: 'plugin_outreach_draft', label: 'Plugin: Outreach', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-purple-400' },
  { key: 'plugin_call_prep', label: 'Plugin: Call Prep', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-purple-400' },
  { key: 'plugin_enrichment', label: 'Plugin: Enrichment', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-purple-400' },
  { key: 'plugin_content', label: 'Plugin: Content', color: 'bg-purple-100 text-purple-800', borderColor: 'border-l-purple-300' },
  { key: 'partnership_meeting', label: 'Partnership Meeting', color: 'bg-teal/15 text-teal', borderColor: 'border-l-teal' },
  { key: 'referral_received', label: 'Referral Received', color: 'bg-gold/20 text-charcoal', borderColor: 'border-l-gold' },
  { key: 'referral_sent', label: 'Referral Sent', color: 'bg-gold/15 text-charcoal', borderColor: 'border-l-gold' },
]

const TYPE_MAP = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.key, t]))

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  video_call: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  phone_call: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  dm: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  linkedin: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  meeting: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  referral: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
  plugin_research: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  plugin_outreach_draft: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  plugin_call_prep: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  plugin_enrichment: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  plugin_content: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  partnership_meeting: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  referral_received: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
  referral_sent: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
}

const DATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PipelineActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'plugin'>('all')

  // Modals
  const [showLogModal, setShowLogModal] = useState(false)
  const [showNotesStep1, setShowNotesStep1] = useState(false)
  const [notesResult, setNotesResult] = useState<ParsedResult | null>(null)

  // Expanded body / raw notes per activity
  const [expandedBody, setExpandedBody] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      apiGet<{ activities: Activity[] }>('/api/pipeline/activities'),
      apiGet<{ companies: Company[] }>('/api/pipeline/companies'),
      apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts'),
      apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities'),
    ])
      .then(([actData, compData, contactData, oppData]) => {
        setActivities(actData.activities)
        setCompanies(compData.companies)
        setContacts(contactData.contacts)
        setOpportunities(oppData.opportunities)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Client-side filtering
  const filtered = activities.filter(act => {
    if (typeFilter !== 'all' && act.type !== typeFilter) return false
    if (sourceFilter === 'plugin' && !act.plugin_source) return false
    if (sourceFilter === 'manual' && act.plugin_source) return false
    if (search) {
      const q = search.toLowerCase()
      if (!act.subject.toLowerCase().includes(q) && !(act.body || '').toLowerCase().includes(q)) return false
    }
    if (dateFilter !== 'all') {
      const actDate = act.occurred_at.split('T')[0]
      if (dateFilter === 'today' && actDate !== todayStr()) return false
      if (dateFilter === 'week' && actDate < startOfWeek()) return false
      if (dateFilter === 'month' && actDate < startOfMonth()) return false
    }
    return true
  })

  function toggleBody(id: string) {
    setExpandedBody(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleLogActivity(data: Record<string, unknown>) {
    try {
      await apiPost('/api/pipeline/activities', data)
      const refreshed = await apiGet<{ activities: Activity[] }>('/api/pipeline/activities')
      setActivities(refreshed.activities)
      setShowLogModal(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log activity')
    }
  }

  async function handleNotesSubmit(rawNotes: string, contactId: string, opportunityId: string) {
    try {
      const result = await apiPost<ParsedResult>('/api/pipeline/activities/from-notes', {
        raw_notes: rawNotes,
        contact_id: contactId || undefined,
        opportunity_id: opportunityId || undefined,
      })
      setNotesResult(result)
      setShowNotesStep1(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse notes')
    }
  }

  async function handleNotesCorrection(activityId: string, updates: Record<string, unknown>) {
    try {
      if (Object.keys(updates).length > 0) {
        await apiPut(`/api/pipeline/activities/${activityId}`, updates)
      }
      const refreshed = await apiGet<{ activities: Activity[] }>('/api/pipeline/activities')
      setActivities(refreshed.activities)
      setNotesResult(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update activity')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Activities</h1>
          <p className="text-gray-warm text-sm mt-1">{filtered.length} interactions logged</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Log Activity
          </button>
          <button
            onClick={() => setShowNotesStep1(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Paste Call Notes
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg flex items-center justify-between">
          <p className="text-red-soft text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-soft/60 hover:text-red-soft">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${typeFilter === 'all' ? 'bg-charcoal text-white' : 'bg-gray-light text-charcoal hover:bg-charcoal/10'}`}
          >
            All
          </button>
          {ACTIVITY_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(typeFilter === t.key ? 'all' : t.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${typeFilter === t.key ? t.color + ' ring-2 ring-offset-1 ring-charcoal/20' : 'bg-gray-light/50 text-charcoal hover:bg-gray-light'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-light bg-white text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30"
        >
          {DATE_FILTERS.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="pl-9 pr-4 py-1.5 rounded-lg border border-gray-light bg-white text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 w-48"
          />
        </div>

        {/* Source filter */}
        <div className="flex gap-1.5">
          {([
            { key: 'all', label: 'All Sources' },
            { key: 'manual', label: 'Manual' },
            { key: 'plugin', label: 'Plugin-Generated' },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setSourceFilter(s.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${sourceFilter === s.key ? (s.key === 'plugin' ? 'bg-purple-100 text-purple-800 ring-2 ring-offset-1 ring-purple-300' : 'bg-charcoal text-white') : 'bg-gray-light/50 text-charcoal hover:bg-gray-light'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">
            {activities.length === 0 ? 'No activities yet' : 'No activities match your filters'}
          </p>
          <p className="text-gray-warm text-sm mb-4">
            {activities.length === 0 ? 'Log your first interaction to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(act => {
            const typeMeta = TYPE_MAP[act.type] || { label: act.type, color: 'bg-gray-light text-charcoal', borderColor: 'border-l-gray-warm' }
            const bodyExpanded = expandedBody.has(act.id)
            const notesExpanded = expandedNotes.has(act.id)
            const bodyTruncated = act.body && act.body.length > 200

            return (
              <div key={act.id} className={`bg-white rounded-lg border border-gray-light border-l-4 ${typeMeta.borderColor} shadow-sm`}>
                <div className="p-4">
                  {/* Header line */}
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-charcoal">{act.subject}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                        {act.plugin_source && (
                          <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
                            Plugin
                          </span>
                        )}
                        {act.outcome && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-ivory text-charcoal">
                            {act.outcome}
                          </span>
                        )}
                      </div>

                      {/* Contact / Company line */}
                      {(act.pipeline_contacts || act.pipeline_companies) && (
                        <p className="text-xs text-gray-warm mt-1">
                          {act.pipeline_contacts && (
                            <Link to="/dashboard/pipeline/contacts" className="text-teal hover:underline">
                              {act.pipeline_contacts.name}
                            </Link>
                          )}
                          {act.pipeline_contacts?.email && (
                            <span className="text-gray-warm"> ({act.pipeline_contacts.email})</span>
                          )}
                          {act.pipeline_contacts && act.pipeline_companies && ' at '}
                          {act.pipeline_companies && (
                            <Link to="/dashboard/pipeline/companies" className="text-teal hover:underline">
                              {act.pipeline_companies.name}
                            </Link>
                          )}
                        </p>
                      )}

                      {/* Outreach recipient (when type is outreach_draft) */}
                      {(act.type === 'outreach_draft' || act.type === 'plugin_outreach_draft') && (() => {
                        const recipientEmail = act.pipeline_contacts?.email || (act.outcome?.match(/email:\s*(\S+@\S+)/i)?.[1]) || null
                        return recipientEmail ? (
                          <p className="text-xs font-medium text-charcoal mt-1">To: {recipientEmail}</p>
                        ) : null
                      })()}

                      {/* Body */}
                      {act.body && (
                        <div className="mt-2">
                          <p className="text-sm text-charcoal whitespace-pre-wrap">
                            {bodyExpanded || !bodyTruncated ? act.body : act.body.slice(0, 200) + '...'}
                          </p>
                          {bodyTruncated && (
                            <button onClick={() => toggleBody(act.id)} className="text-xs text-teal font-medium mt-1 hover:underline">
                              {bodyExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                          {/* Outreach action buttons */}
                          {(act.type === 'outreach_draft' || act.type === 'plugin_outreach_draft') && (() => {
                            const recipientEmail = act.pipeline_contacts?.email || (act.outcome?.match(/email:\s*(\S+@\S+)/i)?.[1]) || null
                            return (
                              <div className="flex items-center gap-2 mt-1.5 text-xs">
                                <button onClick={() => navigator.clipboard.writeText(act.body || '')} className="text-teal hover:underline font-medium">Copy Draft</button>
                                {recipientEmail && (
                                  <>
                                    <span className="text-gray-light">|</span>
                                    <button onClick={() => navigator.clipboard.writeText(recipientEmail)} className="text-teal hover:underline font-medium">Copy Email</button>
                                    <span className="text-gray-light">|</span>
                                    <a href={`mailto:${recipientEmail}?subject=${encodeURIComponent(act.subject)}&body=${encodeURIComponent(act.body || '')}`} className="text-teal hover:underline font-medium">Open in Gmail</a>
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Opportunity link */}
                      {act.pipeline_opportunities && (
                        <p className="text-xs text-gray-warm mt-1.5">
                          Re: <Link to="/dashboard/pipeline" className="text-teal hover:underline">{act.pipeline_opportunities.title}</Link>
                        </p>
                      )}

                      {/* Next action */}
                      {act.next_action && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs">
                          <svg className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-charcoal">
                            <span className="font-medium">Next:</span> {act.next_action}
                            {act.next_action_date && <span className="text-gray-warm ml-1">({act.next_action_date})</span>}
                          </span>
                        </div>
                      )}

                      {/* Metadata line */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-warm">
                        <span>{timeAgo(act.occurred_at)}</span>
                        {act.duration_minutes && <span>{act.duration_minutes} min</span>}

                        {/* Gemini notes indicator */}
                        {act.gemini_raw_notes && (
                          <button
                            onClick={() => toggleNotes(act.id)}
                            className="flex items-center gap-1 text-teal hover:underline font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Call notes attached
                          </button>
                        )}
                      </div>

                      {/* Expanded raw notes */}
                      {act.gemini_raw_notes && notesExpanded && (
                        <div className="mt-3 bg-ivory rounded-lg p-3 text-xs text-charcoal whitespace-pre-wrap font-mono max-h-60 overflow-y-auto border border-gray-light">
                          {act.gemini_raw_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log Activity Modal */}
      {showLogModal && (
        <LogActivityModal
          contacts={contacts}
          companies={companies}
          opportunities={opportunities}
          onSubmit={handleLogActivity}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {/* Notes Step 1 — Paste */}
      {showNotesStep1 && (
        <NotesStep1Modal
          contacts={contacts}
          opportunities={opportunities}
          onSubmit={handleNotesSubmit}
          onClose={() => setShowNotesStep1(false)}
        />
      )}

      {/* Notes Step 2 — Review */}
      {notesResult && (
        <NotesStep2Modal
          result={notesResult}
          onSave={handleNotesCorrection}
          onClose={() => { setNotesResult(null); apiGet<{ activities: Activity[] }>('/api/pipeline/activities').then(d => setActivities(d.activities)).catch(() => {}) }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log Activity Modal
// ---------------------------------------------------------------------------

function LogActivityModal({
  contacts,
  companies,
  opportunities,
  onSubmit,
  onClose,
}: {
  contacts: Contact[]
  companies: Company[]
  opportunities: Opportunity[]
  onSubmit: (data: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [type, setType] = useState('video_call')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [selectedOppId, setSelectedOppId] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredContacts = contactSearch.length > 0
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts

  const filteredCompanies = companySearch.length > 0
    ? companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
    : companies

  // Auto-fill company when contact selected
  useEffect(() => {
    if (selectedContactId) {
      const contact = contacts.find(c => c.id === selectedContactId)
      if (contact?.company_id) setSelectedCompanyId(contact.company_id)
    }
  }, [selectedContactId, contacts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const data: Record<string, unknown> = { type, subject }
    if (body) data.body = body
    if (outcome) data.outcome = outcome
    if (selectedContactId) data.contact_id = selectedContactId
    if (selectedCompanyId) data.company_id = selectedCompanyId
    if (selectedOppId) data.opportunity_id = selectedOppId
    if (occurredAt) data.occurred_at = new Date(occurredAt).toISOString()
    if (nextAction) data.next_action = nextAction
    if (nextActionDate) data.next_action_date = nextActionDate
    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <h2 className="font-display text-xl font-bold text-charcoal">Log Activity</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Type *</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Date</label>
              <input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Subject *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Discovery call — discussed margins" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Notes</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Details about the interaction..." className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Outcome</label>
            <input type="text" value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g., Booked follow-up for Thursday" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          {/* Contact typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Contact</label>
            <input
              type="text"
              value={selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name || '' : contactSearch}
              onChange={e => { setContactSearch(e.target.value); setSelectedContactId(''); setShowContactDropdown(true) }}
              onFocus={() => setShowContactDropdown(true)}
              placeholder="Search contacts..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
            {selectedContactId && (
              <button type="button" onClick={() => { setSelectedContactId(''); setContactSearch('') }} className="absolute right-3 top-[38px] text-gray-warm hover:text-charcoal">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {showContactDropdown && filteredContacts.length > 0 && !selectedContactId && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                {filteredContacts.slice(0, 8).map(c => (
                  <button key={c.id} type="button" onClick={() => { setSelectedContactId(c.id); setContactSearch(''); setShowContactDropdown(false) }} className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory">
                    {c.name}{c.title && <span className="text-gray-warm ml-2 text-xs">{c.title}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Company typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company</label>
            <input
              type="text"
              value={selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name || '' : companySearch}
              onChange={e => { setCompanySearch(e.target.value); setSelectedCompanyId(''); setShowCompanyDropdown(true) }}
              onFocus={() => setShowCompanyDropdown(true)}
              placeholder="Search companies..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
            {selectedCompanyId && (
              <button type="button" onClick={() => { setSelectedCompanyId(''); setCompanySearch('') }} className="absolute right-3 top-[38px] text-gray-warm hover:text-charcoal">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {showCompanyDropdown && filteredCompanies.length > 0 && !selectedCompanyId && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                {filteredCompanies.slice(0, 8).map(c => (
                  <button key={c.id} type="button" onClick={() => { setSelectedCompanyId(c.id); setCompanySearch(''); setShowCompanyDropdown(false) }} className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory">
                    {c.name}{c.industry && <span className="text-gray-warm ml-2 text-xs">{c.industry}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opportunity */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Opportunity</label>
            <select value={selectedOppId} onChange={e => setSelectedOppId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
              <option value="">None</option>
              {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>

          {/* Next action */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Next Action</label>
              <input type="text" value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="Follow up with proposal" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Next Action Date</label>
              <input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !subject.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Saving...</span> : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes Step 1 — Paste Call Notes
// ---------------------------------------------------------------------------

function NotesStep1Modal({
  contacts,
  opportunities,
  onSubmit,
  onClose,
}: {
  contacts: Contact[]
  opportunities: Opportunity[]
  onSubmit: (rawNotes: string, contactId: string, opportunityId: string) => void
  onClose: () => void
}) {
  const [rawNotes, setRawNotes] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [selectedOppId, setSelectedOppId] = useState('')
  const [processing, setProcessing] = useState(false)

  const filteredContacts = contactSearch.length > 0
    ? contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    : contacts

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProcessing(true)
    await onSubmit(rawNotes, selectedContactId, selectedOppId)
    setProcessing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Paste Call Notes</h2>
            <p className="text-xs text-gray-warm mt-0.5">Paste your Gemini or meeting notes and we'll extract the key details.</p>
          </div>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Meeting Notes *</label>
            <textarea
              value={rawNotes}
              onChange={e => setRawNotes(e.target.value)}
              rows={14}
              placeholder="Paste your Gemini meeting notes here...

The system will extract:
• Subject line (from the first line)
• Key discussion points
• Outcome / decisions
• Next action items
• Follow-up dates"
              className="w-full px-4 py-3 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none font-mono"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Contact */}
            <div className="relative">
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Contact (optional)</label>
              <input
                type="text"
                value={selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name || '' : contactSearch}
                onChange={e => { setContactSearch(e.target.value); setSelectedContactId(''); setShowContactDropdown(true) }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="Link to a contact..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
              {selectedContactId && (
                <button type="button" onClick={() => { setSelectedContactId(''); setContactSearch('') }} className="absolute right-3 top-[38px] text-gray-warm hover:text-charcoal">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {showContactDropdown && filteredContacts.length > 0 && !selectedContactId && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                  {filteredContacts.slice(0, 8).map(c => (
                    <button key={c.id} type="button" onClick={() => { setSelectedContactId(c.id); setContactSearch(''); setShowContactDropdown(false) }} className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory">
                      {c.name}{c.title && <span className="text-gray-warm ml-2 text-xs">{c.title}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunity */}
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Opportunity (optional)</label>
              <select value={selectedOppId} onChange={e => setSelectedOppId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                <option value="">None</option>
                {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">Cancel</button>
            <button type="submit" disabled={processing || !rawNotes.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {processing ? <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Processing...</span> : 'Process Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Notes Step 2 — Review & Correct
// ---------------------------------------------------------------------------

function NotesStep2Modal({
  result,
  onSave,
  onClose,
}: {
  result: ParsedResult
  onSave: (activityId: string, updates: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [editType, setEditType] = useState(result.activity.type)
  const [editSubject, setEditSubject] = useState(result.parsed_fields.subject)
  const [editBody, setEditBody] = useState(result.parsed_fields.body || '')
  const [editOutcome, setEditOutcome] = useState(result.parsed_fields.outcome || '')
  const [editNextAction, setEditNextAction] = useState(result.parsed_fields.next_action || '')
  const [editNextActionDate, setEditNextActionDate] = useState(result.parsed_fields.next_action_date || '')
  const [showRawNotes, setShowRawNotes] = useState(false)
  const [saving, setSaving] = useState(false)

  // Contact/company display from activity (read-only in step 2 — was set during parsing)
  const contactName = result.activity.pipeline_contacts?.name
  const companyName = result.activity.pipeline_companies?.name

  async function handleSave() {
    setSaving(true)
    const updates: Record<string, unknown> = {}
    if (editType !== result.activity.type) updates.type = editType
    if (editSubject !== result.parsed_fields.subject) updates.subject = editSubject
    if (editBody !== (result.parsed_fields.body || '')) updates.body = editBody || null
    if (editOutcome !== (result.parsed_fields.outcome || '')) updates.outcome = editOutcome || null
    if (editNextAction !== (result.parsed_fields.next_action || '')) updates.next_action = editNextAction || null
    if (editNextActionDate !== (result.parsed_fields.next_action_date || '')) updates.next_action_date = editNextActionDate || null
    await onSave(result.activity.id, updates)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">Review Extracted Data</h2>
            <p className="text-xs text-gray-warm mt-0.5">Activity logged. Review and correct any extracted fields.</p>
          </div>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Success banner */}
          <div className="bg-green/10 border border-green/30 rounded-lg px-4 py-3 flex items-start gap-2">
            <svg className="w-5 h-5 text-green flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green">Activity logged successfully</p>
              {result.task_created && (
                <p className="text-xs text-green/80 mt-0.5">
                  Follow-up task created: "{result.task_created.title}"
                  {result.task_created.due_date && ` — due ${result.task_created.due_date}`}
                </p>
              )}
            </div>
          </div>

          {/* Linked entities (read-only) */}
          {(contactName || companyName) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {contactName && <span className="px-2 py-1 bg-teal/10 text-teal rounded-full font-medium">{contactName}</span>}
              {companyName && <span className="px-2 py-1 bg-ivory text-charcoal rounded-full font-medium">{companyName}</span>}
            </div>
          )}

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Activity Type</label>
              <select value={editType} onChange={e => setEditType(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                {ACTIVITY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Outcome</label>
              <input type="text" value={editOutcome} onChange={e => setEditOutcome(e.target.value)} placeholder="What resulted" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Subject</label>
            <input type="text" value={editSubject} onChange={e => setEditSubject(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Key Points</label>
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Next Action</label>
              <input type="text" value={editNextAction} onChange={e => setEditNextAction(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Next Action Date</label>
              <input type="date" value={editNextActionDate} onChange={e => setEditNextActionDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
          </div>

          {/* Raw notes toggle */}
          <div>
            <button onClick={() => setShowRawNotes(!showRawNotes)} className="text-xs text-teal font-medium hover:underline flex items-center gap-1">
              <svg className={`w-3.5 h-3.5 transition-transform ${showRawNotes ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {showRawNotes ? 'Hide' : 'Show'} raw notes
            </button>
            {showRawNotes && (
              <div className="mt-2 bg-ivory rounded-lg p-3 text-xs text-charcoal whitespace-pre-wrap font-mono max-h-48 overflow-y-auto border border-gray-light">
                {result.activity.gemini_raw_notes}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">Done</button>
            <button
              onClick={handleSave}
              disabled={saving || !editSubject.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Saving...</span> : 'Save Corrections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
