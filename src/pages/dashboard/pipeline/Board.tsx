import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
}

interface Contact {
  id: string
  name: string
  title: string | null
  email: string | null
  company_id: string | null
}

interface Opportunity {
  id: string
  company_id: string
  primary_contact_id: string | null
  title: string
  stage: string
  estimated_value: number | null
  estimated_close_date: string | null
  loss_reason: string | null
  notes: string | null
  assigned_to: string | null
  converted_client_id: string | null
  converted_engagement_id: string | null
  referred_by_engagement_id: string | null
  referred_by_contact_name: string | null
  calendly_event_uri: string | null
  calendly_invitee_uri: string | null
  calendly_booking_time: string | null
  nda_envelope_id: string | null
  nda_confirmation_token: string | null
  nda_requested_at: string | null
  agreement_envelope_id: string | null
  created_at: string
  updated_at: string
  pipeline_companies: { id: string; name: string } | null
  pipeline_contacts: { id: string; name: string } | null
  // Enriched client-side
  activities?: Activity[]
  tasks?: Task[]
}

interface EngagementSummary {
  id: string
  company_name: string | null
  status: string
}

interface Activity {
  id: string
  type: string
  subject: string
  occurred_at: string
  next_action_date: string | null
  outcome: string | null
  next_action: string | null
  pipeline_contacts: { id: string; name: string } | null
  pipeline_companies: { id: string; name: string } | null
}

interface Task {
  id: string
  title: string
  due_date: string | null
  priority: string
  status: string
  pipeline_contacts: { id: string; name: string } | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES = [
  { key: 'identified', label: 'Identified', color: 'bg-gray-light text-charcoal', headerBg: 'bg-gray-light/50' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-800', headerBg: 'bg-blue-50' },
  { key: 'discovery_scheduled', label: 'Discovery', color: 'bg-teal/10 text-teal', headerBg: 'bg-teal/5' },
  { key: 'nda_sent', label: 'NDA Sent', color: 'bg-gold/10 text-charcoal', headerBg: 'bg-gold/5' },
  { key: 'nda_signed', label: 'NDA Signed', color: 'bg-gold/20 text-charcoal', headerBg: 'bg-gold/10' },
  { key: 'discovery_complete', label: 'Disc. Complete', color: 'bg-teal/20 text-teal', headerBg: 'bg-teal/10' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-gold/30 text-charcoal', headerBg: 'bg-gold/15' },
  { key: 'agreement_sent', label: 'Agreement Sent', color: 'bg-crimson/10 text-crimson', headerBg: 'bg-crimson/5' },
  { key: 'won', label: 'Won', color: 'bg-green/10 text-green', headerBg: 'bg-green/5' },
  { key: 'lost', label: 'Lost', color: 'bg-red-soft/10 text-red-soft', headerBg: 'bg-red-soft/5' },
]

const ALL_STAGES = [...STAGES.map(s => s.key), 'dormant']

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  video_call: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  phone_call: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  dm: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  linkedin: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  meeting: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  referral: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
}

function formatCurrency(value: number | null): string {
  if (value == null) return '--'
  return `$${value.toLocaleString()}`
}

function daysInStage(updatedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)))
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

function nextActionDateClass(dateStr: string | null): string {
  if (!dateStr) return 'text-gray-warm'
  const today = new Date().toISOString().split('T')[0]
  if (dateStr < today) return 'text-red-soft font-semibold'
  if (dateStr === today) return 'text-gold font-semibold'
  return 'text-gray-warm'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PipelineBoard() {
  const navigate = useNavigate()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterAssignedTo, setFilterAssignedTo] = useState('')
  const [dormantExpanded, setDormantExpanded] = useState(false)

  // Modals
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showLossReason, setShowLossReason] = useState<string | null>(null) // opp id
  const [showConvertConfirm, setShowConvertConfirm] = useState<string | null>(null)
  const [detailOppId, setDetailOppId] = useState<string | null>(null)
  const [showSendAgreement, setShowSendAgreement] = useState<string | null>(null) // opp id

  // Stage move dropdown
  const [stageMenuOppId, setStageMenuOppId] = useState<string | null>(null)
  const stageMenuRef = useRef<HTMLDivElement>(null)

  // Load data
  useEffect(() => {
    Promise.all([
      apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities'),
      apiGet<{ companies: Company[] }>('/api/pipeline/companies'),
      apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts'),
    ])
      .then(([oppData, compData, contactData]) => {
        setOpportunities(oppData.opportunities)
        setCompanies(compData.companies)
        setContacts(contactData.contacts)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Close stage menu on outside click
  useEffect(() => {
    if (!stageMenuOppId) return
    function handleClick(e: MouseEvent) {
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
        setStageMenuOppId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [stageMenuOppId])

  // Helpers
  const filtered = filterAssignedTo
    ? opportunities.filter(o => o.assigned_to === filterAssignedTo)
    : opportunities

  const boardOpps = filtered.filter(o => o.stage !== 'dormant')
  const dormantOpps = filtered.filter(o => o.stage === 'dormant')

  const assignedToValues = [...new Set(opportunities.map(o => o.assigned_to).filter(Boolean))] as string[]

  const totalValue = boardOpps
    .filter(o => o.stage !== 'lost')
    .reduce((sum, o) => sum + (o.estimated_value || 0), 0)

  // Stage change
  async function handleStageChange(oppId: string, newStage: string) {
    setStageMenuOppId(null)

    if (newStage === 'won') {
      const opp = opportunities.find(o => o.id === oppId)
      // If already converted, just move stage without showing dialog
      if (opp?.converted_client_id) {
        try {
          await apiPut(`/api/pipeline/opportunities/${oppId}`, { stage: 'won' })
          setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage: 'won' } : o))
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to update stage')
        }
        return
      }
      setShowConvertConfirm(oppId)
      // Update stage to won first
      try {
        await apiPut(`/api/pipeline/opportunities/${oppId}`, { stage: 'won' })
        setOpportunities(prev => prev.map(o => o.id === oppId ? { ...o, stage: 'won' } : o))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update stage')
      }
      return
    }

    if (newStage === 'lost') {
      setShowLossReason(oppId)
      return
    }

    try {
      await apiPut(`/api/pipeline/opportunities/${oppId}`, { stage: newStage })
      setOpportunities(prev => prev.map(o =>
        o.id === oppId ? { ...o, stage: newStage, updated_at: new Date().toISOString() } : o
      ))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update stage')
    }
  }

  // Convert — navigate to the full ConversionReview page
  function handleConvertNavigate(oppId: string) {
    setShowConvertConfirm(null)
    navigate(`/dashboard/pipeline/convert/${oppId}`)
  }

  // Loss reason submit
  async function handleLossSubmit(oppId: string, reason: string) {
    try {
      await apiPut(`/api/pipeline/opportunities/${oppId}`, { stage: 'lost', loss_reason: reason })
      setOpportunities(prev => prev.map(o =>
        o.id === oppId ? { ...o, stage: 'lost', loss_reason: reason, updated_at: new Date().toISOString() } : o
      ))
      setShowLossReason(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update opportunity')
    }
  }

  // Quick add
  async function handleQuickAdd(data: {
    company_name: string
    company_id?: string
    contact_name?: string
    contact_id?: string
    title: string
    estimated_value: number
    stage: string
    estimated_close_date?: string
    assigned_to?: string
    notes?: string
    referred_by_engagement_id?: string
    referred_by_contact_name?: string
  }) {
    try {
      let companyId = data.company_id
      // Create new company if needed
      if (!companyId && data.company_name) {
        const newCo = await apiPost<Company>('/api/pipeline/companies', { name: data.company_name })
        companyId = newCo.id
        setCompanies(prev => [...prev, newCo])
      }
      if (!companyId) return

      let contactId = data.contact_id
      // Create new contact if needed
      if (!contactId && data.contact_name) {
        const newContact = await apiPost<Contact>('/api/pipeline/contacts', {
          name: data.contact_name,
          company_id: companyId,
        })
        contactId = newContact.id
        setContacts(prev => [...prev, newContact])
      }

      const oppPayload: Record<string, unknown> = {
        company_id: companyId,
        primary_contact_id: contactId || null,
        title: data.title,
        estimated_value: data.estimated_value,
        stage: data.stage,
      }
      if (data.estimated_close_date) oppPayload.estimated_close_date = data.estimated_close_date
      if (data.assigned_to) oppPayload.assigned_to = data.assigned_to
      if (data.notes) oppPayload.notes = data.notes
      if (data.referred_by_engagement_id) oppPayload.referred_by_engagement_id = data.referred_by_engagement_id
      if (data.referred_by_contact_name) oppPayload.referred_by_contact_name = data.referred_by_contact_name

      await apiPost<Opportunity>('/api/pipeline/opportunities', oppPayload)
      // Re-fetch to get joined company/contact names on the new card
      const refreshed = await apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities')
      setOpportunities(refreshed.opportunities)
      setShowQuickAdd(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity')
    }
  }

  // Schedule discovery
  async function handleScheduleDiscovery(oppId: string) {
    try {
      await apiPost(`/api/pipeline/opportunities/${oppId}/schedule-discovery`, {})
      const refreshed = await apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities')
      setOpportunities(refreshed.opportunities)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule discovery')
    }
  }

  // Send agreement
  async function handleSendAgreement(oppId: string, data: { fee: number; preferred_start_date: string; partner_lead: string }) {
    try {
      await apiPost(`/api/pipeline/opportunities/${oppId}/send-agreement`, data)
      const refreshed = await apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities')
      setOpportunities(refreshed.opportunities)
      setShowSendAgreement(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send agreement')
    }
  }

  // Delete opportunity
  async function handleDelete(oppId: string) {
    try {
      await apiDelete(`/api/pipeline/opportunities/${oppId}`)
      setOpportunities(prev => prev.filter(o => o.id !== oppId))
      setDetailOppId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete opportunity')
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
          <h1 className="font-display text-2xl font-bold text-charcoal">Pipeline Board</h1>
          <p className="text-gray-warm text-sm mt-1">
            {formatCurrency(totalValue)} total pipeline value
            {' '}&middot;{' '}
            {boardOpps.filter(o => o.stage !== 'lost').length} active opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {assignedToValues.length > 0 && (
            <select
              value={filterAssignedTo}
              onChange={e => setFilterAssignedTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-light bg-white text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30"
            >
              <option value="">All owners</option>
              {assignedToValues.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Opportunity
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

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STAGES.filter(s => s.key !== 'lost').map(stage => {
          const count = boardOpps.filter(o => o.stage === stage.key).length
          return (
            <span key={stage.key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stage.color}`}>
              {stage.label}: {count}
            </span>
          )
        })}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4 -mx-4 lg:-mx-8 px-4 lg:px-8">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 240}px` }}>
          {STAGES.map(stage => {
            const stageOpps = boardOpps.filter(o => o.stage === stage.key)
            return (
              <div key={stage.key} className="flex-1 min-w-[220px] max-w-[280px]">
                {/* Column header */}
                <div className={`${stage.headerBg} rounded-t-lg px-3 py-2 border border-b-0 border-gray-light`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal">{stage.label}</span>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${stage.color}`}>
                      {stageOpps.length}
                    </span>
                  </div>
                </div>
                {/* Column body */}
                <div className="bg-white/50 border border-gray-light rounded-b-lg p-2 space-y-2 min-h-[120px]">
                  {stageOpps.length === 0 ? (
                    <p className="text-xs text-gray-warm text-center py-6">No opportunities</p>
                  ) : (
                    stageOpps.map(opp => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        onOpenDetail={() => setDetailOppId(opp.id)}
                        onOpenStageMenu={() => setStageMenuOppId(stageMenuOppId === opp.id ? null : opp.id)}
                        stageMenuOpen={stageMenuOppId === opp.id}
                        stageMenuRef={stageMenuOppId === opp.id ? stageMenuRef : undefined}
                        onStageChange={(newStage) => handleStageChange(opp.id, newStage)}
                        currentStage={opp.stage}
                        onScheduleDiscovery={() => handleScheduleDiscovery(opp.id)}
                        onSendAgreement={() => setShowSendAgreement(opp.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dormant section */}
      {dormantOpps.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setDormantExpanded(!dormantExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-warm hover:text-charcoal transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${dormantExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Dormant ({dormantOpps.length})
          </button>
          {dormantExpanded && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {dormantOpps.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  onOpenDetail={() => setDetailOppId(opp.id)}
                  onOpenStageMenu={() => setStageMenuOppId(stageMenuOppId === opp.id ? null : opp.id)}
                  stageMenuOpen={stageMenuOppId === opp.id}
                  stageMenuRef={stageMenuOppId === opp.id ? stageMenuRef : undefined}
                  onStageChange={(newStage) => handleStageChange(opp.id, newStage)}
                  currentStage={opp.stage}
                  onScheduleDiscovery={() => handleScheduleDiscovery(opp.id)}
                  onSendAgreement={() => setShowSendAgreement(opp.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick-add modal */}
      {showQuickAdd && (
        <QuickAddModal
          companies={companies}
          contacts={contacts}
          onSubmit={handleQuickAdd}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {/* Loss reason modal */}
      {showLossReason && (
        <LossReasonModal
          onSubmit={(reason) => handleLossSubmit(showLossReason, reason)}
          onClose={() => setShowLossReason(null)}
        />
      )}

      {/* Convert confirmation */}
      {showConvertConfirm && (
        <ConvertModal
          opp={opportunities.find(o => o.id === showConvertConfirm)!}
          onConvert={() => handleConvertNavigate(showConvertConfirm)}
          onClose={() => setShowConvertConfirm(null)}
        />
      )}

      {/* Send Agreement modal */}
      {showSendAgreement && (
        <SendAgreementModal
          opp={opportunities.find(o => o.id === showSendAgreement)!}
          onSubmit={(data) => handleSendAgreement(showSendAgreement, data)}
          onClose={() => setShowSendAgreement(null)}
        />
      )}

      {/* Detail slide-over */}
      {detailOppId && (
        <OpportunitySlideOver
          oppId={detailOppId}
          onClose={() => setDetailOppId(null)}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Opportunity Card
// ---------------------------------------------------------------------------

function OpportunityCard({
  opp,
  onOpenDetail,
  onOpenStageMenu,
  stageMenuOpen,
  stageMenuRef,
  onStageChange,
  currentStage,
  onScheduleDiscovery,
  onSendAgreement,
}: {
  opp: Opportunity
  onOpenDetail: () => void
  onOpenStageMenu: () => void
  stageMenuOpen: boolean
  stageMenuRef?: React.RefObject<HTMLDivElement | null>
  onStageChange: (stage: string) => void
  currentStage: string
  onScheduleDiscovery?: () => void
  onSendAgreement?: () => void
}) {
  // Find latest next_action_date from the opportunity's activities (if loaded),
  // otherwise we'd need a separate fetch — for board cards just use estimated_close_date as proxy
  const latestActionDate = opp.estimated_close_date

  return (
    <div className={`bg-white rounded-lg border shadow-sm hover:shadow transition-shadow ${opp.converted_engagement_id ? 'border-green/40' : 'border-gray-light'}`}>
      <div className="p-3 cursor-pointer" onClick={onOpenDetail}>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-charcoal truncate flex-1">
            {opp.pipeline_companies?.name || 'Unknown Company'}
          </p>
          {opp.referred_by_engagement_id && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gold/20 text-charcoal" title={`Referred by ${opp.referred_by_contact_name || 'referral'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Ref
            </span>
          )}
          {opp.converted_engagement_id && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green/10 text-green">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Converted
            </span>
          )}
        </div>
        {opp.pipeline_contacts?.name && (
          <p className="text-xs text-gray-warm truncate">{opp.pipeline_contacts.name}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-charcoal">
            {formatCurrency(opp.estimated_value)}
          </span>
          <span className="text-xs text-gray-warm">
            {daysInStage(opp.updated_at)}d
          </span>
        </div>
        {latestActionDate && (
          <p className={`text-xs mt-1 ${nextActionDateClass(latestActionDate)}`}>
            Close: {latestActionDate}
          </p>
        )}
      </div>
      {/* Stage action buttons */}
      {currentStage === 'contacted' && onScheduleDiscovery && (
        <div className="border-t border-gray-light px-3 py-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onScheduleDiscovery() }}
            className="w-full text-xs text-white bg-teal font-medium rounded py-1 hover:bg-teal/90 transition-colors"
          >
            Schedule Discovery
          </button>
        </div>
      )}
      {(currentStage === 'discovery_complete' || currentStage === 'negotiation') && onSendAgreement && (
        <div className="border-t border-gray-light px-3 py-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onSendAgreement() }}
            className="w-full text-xs text-white bg-crimson font-medium rounded py-1 hover:bg-crimson/90 transition-colors"
          >
            Send Agreement
          </button>
        </div>
      )}
      {currentStage === 'won' && opp.converted_engagement_id && (
        <div className="border-t border-gray-light px-3 py-1.5">
          <Link
            to={`/dashboard/engagement/${opp.converted_engagement_id}`}
            onClick={(e) => e.stopPropagation()}
            className="block w-full text-center text-xs text-teal font-medium hover:text-teal/80"
          >
            View Engagement
          </Link>
        </div>
      )}
      {/* Stage move button */}
      <div className="border-t border-gray-light px-3 py-1.5">
        <StageDropdown
          stageMenuOpen={stageMenuOpen}
          stageMenuRef={stageMenuRef}
          currentStage={currentStage}
          onOpenStageMenu={onOpenStageMenu}
          onStageChange={onStageChange}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Portal-rendered Stage Dropdown (escapes overflow-hidden ancestors)
// ---------------------------------------------------------------------------

function StageDropdown({
  stageMenuOpen,
  stageMenuRef,
  currentStage,
  onOpenStageMenu,
  onStageChange,
}: {
  stageMenuOpen: boolean
  stageMenuRef?: React.RefObject<HTMLDivElement | null>
  currentStage: string
  onOpenStageMenu: () => void
  onStageChange: (stage: string) => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [])

  useEffect(() => {
    if (stageMenuOpen) {
      updatePos()
    }
  }, [stageMenuOpen, updatePos])

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); onOpenStageMenu() }}
        className="text-xs text-teal font-medium hover:text-teal/80 flex items-center gap-1"
      >
        Move
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {stageMenuOpen && pos && createPortal(
        <div
          ref={stageMenuRef}
          className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-light py-1 max-h-80 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          {ALL_STAGES.filter(s => s !== currentStage).map(stageKey => {
            const stageMeta = STAGES.find(s => s.key === stageKey)
            const label = stageMeta?.label || 'Dormant'
            return (
              <button
                key={stageKey}
                onClick={(e) => { e.stopPropagation(); onStageChange(stageKey) }}
                className="w-full text-left px-3 py-1.5 text-xs text-charcoal hover:bg-ivory transition-colors"
              >
                {label}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Quick Add Modal
// ---------------------------------------------------------------------------

function useEscapeKey(onClose: () => void) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])
}

function QuickAddModal({
  companies,
  contacts,
  onSubmit,
  onClose,
}: {
  companies: Company[]
  contacts: Contact[]
  onSubmit: (data: { company_name: string; company_id?: string; contact_name?: string; contact_id?: string; title: string; estimated_value: number; stage: string; estimated_close_date?: string; assigned_to?: string; notes?: string; referred_by_engagement_id?: string; referred_by_contact_name?: string }) => void
  onClose: () => void
}) {
  useEscapeKey(onClose)
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('12500')
  const [stage, setStage] = useState('identified')
  const [estimatedCloseDate, setEstimatedCloseDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [oppNotes, setOppNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [showContactDropdown, setShowContactDropdown] = useState(false)

  // Source / Referral
  const [source, setSource] = useState('')
  const [referralEngagementId, setReferralEngagementId] = useState('')
  const [referralContactName, setReferralContactName] = useState('')
  const [engagementSummaries, setEngagementSummaries] = useState<EngagementSummary[]>([])

  useEffect(() => {
    if (source === 'Referral' && engagementSummaries.length === 0) {
      apiGet<{ engagements: EngagementSummary[] }>('/api/engagements/summary')
        .then(data => setEngagementSummaries(data.engagements))
        .catch(() => {})
    }
  }, [source]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCompanies = companySearch.length > 0
    ? companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
    : companies

  const filteredContacts = contacts
    .filter(c => selectedCompanyId ? c.company_id === selectedCompanyId : true)
    .filter(c => contactSearch.length > 0 ? c.name.toLowerCase().includes(contactSearch.toLowerCase()) : true)

  // Auto-suggest title
  useEffect(() => {
    const coName = selectedCompanyId
      ? companies.find(c => c.id === selectedCompanyId)?.name
      : companySearch
    if (coName && !title) {
      setTitle(`${coName} — Diagnostic`)
    }
  }, [selectedCompanyId, companySearch]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit({
      company_name: selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)!.name : companySearch,
      company_id: selectedCompanyId || undefined,
      contact_name: selectedContactId ? undefined : contactSearch || undefined,
      contact_id: selectedContactId || undefined,
      title,
      estimated_value: parseFloat(value) || 12500,
      stage,
      estimated_close_date: estimatedCloseDate || undefined,
      assigned_to: assignedTo || undefined,
      notes: oppNotes || undefined,
      referred_by_engagement_id: source === 'Referral' && referralEngagementId ? referralEngagementId : undefined,
      referred_by_contact_name: source === 'Referral' && referralContactName ? referralContactName : undefined,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-xl font-bold text-charcoal">New Opportunity</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Company typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company *</label>
            <input
              type="text"
              value={selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name || '' : companySearch}
              onChange={e => {
                setCompanySearch(e.target.value)
                setSelectedCompanyId('')
                setShowCompanyDropdown(true)
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              placeholder="Search or type new company name"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              required
            />
            {showCompanyDropdown && filteredCompanies.length > 0 && !selectedCompanyId && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                {filteredCompanies.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCompanyId(c.id); setCompanySearch(''); setShowCompanyDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory"
                  >
                    {c.name}
                    {c.industry && <span className="text-gray-warm ml-2 text-xs">{c.industry}</span>}
                  </button>
                ))}
                {companySearch && !filteredCompanies.find(c => c.name.toLowerCase() === companySearch.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCompanyId(''); setShowCompanyDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-teal font-medium hover:bg-ivory border-t border-gray-light"
                  >
                    + Create "{companySearch}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Primary Contact</label>
            <input
              type="text"
              value={selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name || '' : contactSearch}
              onChange={e => {
                setContactSearch(e.target.value)
                setSelectedContactId('')
                setShowContactDropdown(true)
              }}
              onFocus={() => setShowContactDropdown(true)}
              placeholder="Search or type contact name"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
            {showContactDropdown && filteredContacts.length > 0 && !selectedContactId && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                {filteredContacts.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedContactId(c.id); setContactSearch(''); setShowContactDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory"
                  >
                    {c.name}
                    {c.title && <span className="text-gray-warm ml-2 text-xs">{c.title}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Acme Corp — Q1 Diagnostic"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              required
            />
          </div>

          {/* Value + Stage row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Est. Value ($)</label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Close Date + Assigned To row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Est. Close Date</label>
              <input
                type="date"
                value={estimatedCloseDate}
                onChange={e => setEstimatedCloseDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Assigned To</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="">Select...</option>
                <option value="George DeVries">George DeVries</option>
                <option value="Alfonso Cordon">Alfonso Cordon</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Notes</label>
            <textarea
              value={oppNotes}
              onChange={e => setOppNotes(e.target.value)}
              rows={3}
              placeholder="Initial notes about this opportunity..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
            />
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Source</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="">Select...</option>
              <option value="Cold Outreach">Cold Outreach</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Warm Network">Warm Network</option>
              <option value="Referral">Referral</option>
              <option value="Event">Event</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Referral fields (conditional) */}
          {source === 'Referral' && (
            <div className="space-y-3 pl-3 border-l-2 border-gold/30">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Referring Engagement</label>
                <select
                  value={referralEngagementId}
                  onChange={e => setReferralEngagementId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                >
                  <option value="">Select engagement...</option>
                  {engagementSummaries.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.company_name || 'Unknown'} ({e.status.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Referred By</label>
                <input
                  type="text"
                  value={referralContactName}
                  onChange={e => setReferralContactName(e.target.value)}
                  placeholder="Person's name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!companySearch && !selectedCompanyId) || !title}
              className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </span>
              ) : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loss Reason Modal
// ---------------------------------------------------------------------------

function LossReasonModal({ onSubmit, onClose }: { onSubmit: (reason: string) => void; onClose: () => void }) {
  useEscapeKey(onClose)
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">Loss Reason</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-warm">Why was this opportunity lost?</p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            placeholder="e.g., Budget constraints, went with competitor, timing not right..."
            className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onSubmit(reason)}
              disabled={!reason.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-soft rounded-lg hover:bg-red-soft/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark as Lost
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Convert Modal — Multi-step: Confirm → Preview → Success
// ---------------------------------------------------------------------------

function ConvertModal({
  opp,
  onConvert,
  onClose,
}: {
  opp: Opportunity
  onConvert: () => void
  onClose: () => void
}) {
  useEscapeKey(onClose)

  const companyName = opp.pipeline_companies?.name || opp.title
  const contactName = opp.pipeline_contacts?.name

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light">
          <h2 className="font-display text-lg font-bold text-charcoal">Opportunity Won</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-ivory rounded-lg px-4 py-3 text-sm">
            <p className="font-semibold text-charcoal">{companyName}</p>
            {contactName && <p className="text-gray-warm">{contactName}</p>}
            <p className="text-gray-warm mt-1">{formatCurrency(opp.estimated_value)}</p>
          </div>
          <p className="text-sm text-charcoal">
            This opportunity has been marked as <strong className="text-green">Won</strong>. Would you like to convert it into a client engagement?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onConvert}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-green rounded-lg hover:bg-green/90 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Convert to Engagement
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
            >
              Just Mark as Won
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Opportunity Slide-Over Detail
// ---------------------------------------------------------------------------

function OpportunitySlideOver({
  oppId,
  onClose,
  onStageChange,
  onDelete,
}: {
  oppId: string
  onClose: () => void
  onStageChange: (oppId: string, stage: string) => void
  onDelete: (oppId: string) => void
}) {
  useEscapeKey(onClose)
  const [opp, setOpp] = useState<Opportunity | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    apiGet<Opportunity & { activities: Activity[]; tasks: Task[] }>(`/api/pipeline/opportunities/${oppId}`)
      .then(data => {
        setOpp(data)
        setActivities(data.activities || [])
        setTasks(data.tasks || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [oppId])

  const stageMeta = STAGES.find(s => s.key === opp?.stage) || { label: opp?.stage || '', color: 'bg-gray-light text-charcoal' }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light flex-shrink-0">
          <h2 className="font-display text-lg font-bold text-charcoal truncate">Opportunity Detail</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-crimson border-t-transparent rounded-full" />
            </div>
          ) : opp ? (
            <>
              {/* Title & stage */}
              <div>
                <h3 className="text-lg font-semibold text-charcoal">{opp.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${stageMeta.color}`}>
                    {stageMeta.label}
                  </span>
                  <span className="text-xs text-gray-warm">{daysInStage(opp.updated_at)} days in stage</span>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-warm text-xs mb-0.5">Company</p>
                  <p className="font-medium text-charcoal">{opp.pipeline_companies?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-warm text-xs mb-0.5">Contact</p>
                  <p className="font-medium text-charcoal">{opp.pipeline_contacts?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-warm text-xs mb-0.5">Est. Value</p>
                  <p className="font-medium text-charcoal">{formatCurrency(opp.estimated_value)}</p>
                </div>
                <div>
                  <p className="text-gray-warm text-xs mb-0.5">Close Date</p>
                  <p className="font-medium text-charcoal">{opp.estimated_close_date || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-warm text-xs mb-0.5">Assigned To</p>
                  <p className="font-medium text-charcoal">{opp.assigned_to || '—'}</p>
                </div>
                {opp.loss_reason && (
                  <div className="col-span-2">
                    <p className="text-gray-warm text-xs mb-0.5">Loss Reason</p>
                    <p className="font-medium text-red-soft">{opp.loss_reason}</p>
                  </div>
                )}
                {opp.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-warm text-xs mb-0.5">Notes</p>
                    <p className="text-charcoal whitespace-pre-wrap">{opp.notes}</p>
                  </div>
                )}
              </div>

              {/* Stage change */}
              <div>
                <p className="text-xs font-semibold text-charcoal mb-1.5">Move to Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STAGES.filter(s => s !== opp.stage).map(stageKey => {
                    const meta = STAGES.find(s => s.key === stageKey)
                    return (
                      <button
                        key={stageKey}
                        onClick={() => onStageChange(opp.id, stageKey)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border border-gray-light hover:border-teal transition-colors ${meta?.color || 'bg-gray-light/50 text-charcoal'}`}
                      >
                        {meta?.label || 'Dormant'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Referral attribution */}
              {opp.referred_by_engagement_id && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg px-4 py-3">
                  <p className="text-sm text-charcoal font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Referral
                  </p>
                  {opp.referred_by_contact_name && (
                    <p className="text-xs text-gray-warm mt-1">Referred by: {opp.referred_by_contact_name}</p>
                  )}
                  <Link
                    to={`/dashboard/engagement/${opp.referred_by_engagement_id}`}
                    className="text-xs text-teal underline hover:text-teal/80"
                  >
                    View referring engagement
                  </Link>
                </div>
              )}

              {/* Converted banner */}
              {opp.converted_engagement_id && (
                <div className="bg-green/10 border border-green/30 rounded-lg px-4 py-3">
                  <p className="text-sm text-green font-medium">
                    Converted to engagement
                  </p>
                  <Link
                    to={`/dashboard/engagement/${opp.converted_engagement_id}`}
                    className="text-xs text-teal underline hover:text-teal/80"
                  >
                    View engagement
                  </Link>
                </div>
              )}

              {/* Convert to Engagement button */}
              {!opp.converted_engagement_id && ['won', 'negotiation', 'proposal_sent'].includes(opp.stage) && (
                <Link
                  to={`/dashboard/pipeline/convert/${opp.id}`}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                  Convert to Engagement
                </Link>
              )}

              {/* Activities */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal mb-2">Recent Activities</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-warm">No activities yet</p>
                ) : (
                  <div className="space-y-2">
                    {activities.slice(0, 10).map(act => (
                      <div key={act.id} className="flex items-start gap-2 text-xs">
                        <svg className="w-4 h-4 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-charcoal font-medium truncate">{act.subject}</p>
                          {act.outcome && <p className="text-gray-warm truncate">{act.outcome}</p>}
                        </div>
                        <span className="text-gray-warm flex-shrink-0">{timeAgo(act.occurred_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal mb-2">Tasks</h4>
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-warm">No tasks</p>
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.status === 'complete' ? 'bg-green' :
                          task.priority === 'high' ? 'bg-red-soft' : 'bg-gold'
                        }`} />
                        <span className={`flex-1 ${task.status === 'complete' ? 'line-through text-gray-warm' : 'text-charcoal'}`}>
                          {task.title}
                        </span>
                        {task.due_date && (
                          <span className={nextActionDateClass(task.due_date)}>
                            {task.due_date}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete */}
              <div className="border-t border-gray-light pt-4">
                {confirmDelete ? (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-red-soft flex-1">Delete this opportunity?</p>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs text-charcoal hover:underline">Cancel</button>
                    <button onClick={() => onDelete(opp.id)} className="text-xs text-white bg-red-soft px-3 py-1 rounded-lg hover:bg-red-soft/90">Delete</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs text-red-soft hover:underline"
                  >
                    Delete opportunity
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-warm text-center py-8">Opportunity not found</p>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Send Agreement Modal
// ---------------------------------------------------------------------------

function SendAgreementModal({
  opp,
  onSubmit,
  onClose,
}: {
  opp: Opportunity
  onSubmit: (data: { fee: number; preferred_start_date: string; partner_lead: string }) => void
  onClose: () => void
}) {
  useEscapeKey(onClose)
  const [fee, setFee] = useState(String(opp.estimated_value || 12500))
  const [startDate, setStartDate] = useState('')
  const [partnerLead, setPartnerLead] = useState(opp.assigned_to || 'George DeVries')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit({
      fee: parseFloat(fee) || 12500,
      preferred_start_date: startDate || 'TBD',
      partner_lead: partnerLead,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-lg font-bold text-charcoal">Send Agreement</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-warm">
            Send the Engagement Agreement to <strong className="text-charcoal">{opp.pipeline_companies?.name || 'the client'}</strong> via DocuSign.
          </p>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Engagement Fee ($)</label>
            <input
              type="number"
              value={fee}
              onChange={e => setFee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              min="0"
              step="100"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Preferred Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Partner Lead</label>
            <select
              value={partnerLead}
              onChange={e => setPartnerLead(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="George DeVries">George DeVries</option>
              <option value="Alfonso Cordon">Alfonso Cordon</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </span>
              ) : 'Send Agreement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
