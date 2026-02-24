import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiUpload } from '../../lib/api'

interface DocumentRecord {
  id: string
  category: string
  filename: string
  storage_path: string
  file_size: number | null
  uploaded_at: string
  document_type: string
  item_name: string | null
  uploaded_by: string
}

interface EngagementData {
  id: string
  client_id: string
  status: string
  phase: number
  fee: number | null
  start_date: string | null
  target_end_date: string | null
  partner_lead: string | null
  pain_points: string | null
  discovery_notes: string | null
  upload_token: string
  deliverable_token: string
  created_at: string
  clients: {
    company_name: string
    primary_contact_name: string
    primary_contact_email: string
    primary_contact_phone: string | null
    industry: string | null
    revenue_range: string | null
    employee_count: string | null
    website_url: string | null
    referral_source: string | null
  }
  interview_contacts: Array<{
    contact_number: number
    name: string
    title: string | null
    email: string | null
    phone: string | null
    linkedin_url: string | null
  }>
  legal_documents: Array<{
    type: string
    status: string
    docusign_envelope_id: string | null
    sent_at: string | null
    signed_at: string | null
  }>
  documents: DocumentRecord[]
  research_documents: Array<{
    type: string
    content: string
    contact_name: string | null
    created_at: string
  }>
  debrief_complete: boolean
  deliverables: Array<{
    id: string
    type: string
    status: string
    wave: number
    storage_path: string | null
    filename: string | null
    approved_at: string | null
    released_at: string | null
  }>
  activity_log: Array<{
    actor: string
    action: string
    details: Record<string, unknown>
    created_at: string
  }>
}

const ALL_STATUSES = [
  'nda_pending', 'nda_signed', 'discovery_done', 'agreement_pending', 'agreement_signed',
  'documents_pending', 'documents_received',
  'phase_0', 'phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6', 'phase_7', 'phases_complete',
  'debrief', 'wave_1_released', 'wave_2_released', 'closed',
]

const PHASE_INFO = [
  { num: 0, name: 'Proposal & Setup', short: 'Setup' },
  { num: 1, name: 'Data Intake & Baseline', short: 'Intake', reviewGate: true },
  { num: 2, name: 'Leadership Interviews', short: 'Interviews' },
  { num: 3, name: 'Profit Leak Quantification', short: 'Quantify', reviewGate: true },
  { num: 4, name: 'Optimization Analysis', short: 'Optimize' },
  { num: 5, name: 'Report Assembly', short: 'Reports' },
  { num: 6, name: 'Quality Control', short: 'QC', reviewGate: true },
  { num: 7, name: 'Close & Archive', short: 'Archive' },
]

const UPLOAD_LINK_STATUSES = new Set([
  'agreement_signed', 'documents_pending', 'documents_received',
  'phase_1', 'phase_2', 'phase_3',
])

const DELIVERABLE_LABELS: Record<string, string> = {
  exec_summary: 'Executive Summary',
  full_report: 'Full Diagnostic Report',
  workbook: 'Profit Leak Workbook',
  roadmap: '90-Day Implementation Roadmap',
  deck: 'Presentation Deck',
  retainer_proposal: 'Phase 2 Retainer Proposal',
}

const DELIVERABLE_STATUSES_SHOWING = new Set([
  'phase_5', 'phase_6', 'phase_7', 'phases_complete',
  'debrief', 'wave_1_released', 'wave_2_released', 'closed',
])

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'A. Financial Statements',
  payroll: 'B. Payroll & Compensation',
  vendor: 'C. Vendor & Expense',
  revenue: 'D. Revenue & Collections',
  operations: 'E. Operations',
  legal: 'F. Legal & Tax',
}

const CATEGORY_ORDER = ['financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal']

// The 12 required item keys (must match backend checklist)
const REQUIRED_ITEM_KEYS = new Set([
  'income_stmt_ytd', 'balance_sheet', 'cash_flow_stmt', 'trial_balance', 'chart_of_accounts',
  'payroll_register', 'benefits_summary',
  'ap_aging', 'vendor_list',
  'ar_aging', 'revenue_by_customer',
  'tax_returns',
])

const REQUIRED_ITEM_NAMES: Record<string, string> = {
  income_stmt_ytd: 'Income Statement (YTD + prior 2 years)',
  balance_sheet: 'Balance Sheet (current + prior 2 years)',
  cash_flow_stmt: 'Cash Flow Statement (prior 2 years)',
  trial_balance: 'Trial Balance (current period)',
  chart_of_accounts: 'Chart of Accounts',
  payroll_register: 'Payroll Register (last 12 months)',
  benefits_summary: 'Benefits Summary / Enrollment',
  ap_aging: 'Accounts Payable Aging Report',
  vendor_list: 'Vendor List with Annual Spend',
  ar_aging: 'Accounts Receivable Aging Report',
  revenue_by_customer: 'Revenue by Customer / Segment (last 12 months)',
  tax_returns: 'Tax Returns (prior 2 years)',
}

function statusLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [researchLoading, setResearchLoading] = useState('')
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null)
  const [sendingUploadLink, setSendingUploadLink] = useState(false)
  const [uploadLinkSent, setUploadLinkSent] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)
  const [phasePrompt, setPhasePrompt] = useState<{ phase_number: number; name: string; rendered_text: string; variables_used: Record<string, string> } | null>(null)
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [advanceLoading, setAdvanceLoading] = useState(false)
  const [advanceDialog, setAdvanceDialog] = useState<'none' | 'simple' | 'review'>('none')
  const [advanceNotes, setAdvanceNotes] = useState('')
  const [beginLoading, setBeginLoading] = useState(false)
  const [uploadingDeliverableId, setUploadingDeliverableId] = useState<string | null>(null)
  const [approvingDeliverableId, setApprovingDeliverableId] = useState<string | null>(null)
  const [releasingWave, setReleasingWave] = useState<1 | 2 | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [ensuringDeliverables, setEnsuringDeliverables] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!id) return
    apiGet<EngagementData>(`/api/engagements/${id}`)
      .then(d => {
        setData(d)
        // Check if upload link was already sent
        const linkSent = d.activity_log.some(l => l.action === 'upload_link_sent')
        if (linkSent) setUploadLinkSent(true)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const triggerResearch = async (type: 'discovery' | 'interviews') => {
    if (!id) return
    setResearchLoading(type)
    try {
      await apiPost(`/api/engagements/${id}/research/${type}`)
    } catch {}
    setResearchLoading('')
  }

  const sendUploadLink = async () => {
    if (!id) return
    setSendingUploadLink(true)
    try {
      await apiPost(`/api/engagements/${id}/send-upload-link`)
      setUploadLinkSent(true)
    } catch {}
    setSendingUploadLink(false)
  }

  const downloadDoc = async (docId: string) => {
    if (!id) return
    setDownloadingDocId(docId)
    try {
      const result = await apiGet<{ url: string; filename: string }>(`/api/engagements/${id}/documents/${docId}/download`)
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } catch {}
    setDownloadingDocId(null)
  }

  const isInPhases = data && /^phase_\d$/.test(data.status)

  const loadPhasePrompt = async () => {
    if (!id || !data) return
    setPromptLoading(true)
    try {
      const result = await apiGet<{ phase_number: number; name: string; rendered_text: string; variables_used: Record<string, string> }>(`/api/engagements/${id}/prompt/${data.phase}`)
      setPhasePrompt(result)
    } catch {}
    setPromptLoading(false)
  }

  const copyPrompt = async () => {
    if (!phasePrompt) return
    try {
      await navigator.clipboard.writeText(phasePrompt.rendered_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = phasePrompt.rendered_text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAdvanceClick = () => {
    if (!data) return
    const isReviewGate = [1, 3, 6].includes(data.phase)
    setAdvanceDialog(isReviewGate ? 'review' : 'simple')
  }

  const doAdvance = async (reviewConfirmed: boolean) => {
    if (!id) return
    setAdvanceLoading(true)
    try {
      await apiPost(`/api/engagements/${id}/advance-phase`, {
        notes: advanceNotes || null,
        review_confirmed: reviewConfirmed,
      })
      // Reload engagement
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
      setPhasePrompt(null)
      setPromptExpanded(false)
      setAdvanceDialog('none')
      setAdvanceNotes('')
    } catch {}
    setAdvanceLoading(false)
  }

  const beginPhases = async () => {
    if (!id) return
    setBeginLoading(true)
    try {
      await apiPost(`/api/engagements/${id}/begin-phases`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setBeginLoading(false)
  }

  const ensureDeliverables = async () => {
    if (!id) return
    setEnsuringDeliverables(true)
    try {
      await apiPost(`/api/engagements/${id}/deliverables/ensure`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setEnsuringDeliverables(false)
  }

  const uploadDeliverable = async (deliverableId: string, file: File) => {
    if (!id) return
    setUploadingDeliverableId(deliverableId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiUpload(`/api/engagements/${id}/deliverables/${deliverableId}/upload`, formData)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setUploadingDeliverableId(null)
  }

  const approveDeliverable = async (deliverableId: string) => {
    if (!id) return
    setApprovingDeliverableId(deliverableId)
    try {
      await apiPut(`/api/deliverables/${deliverableId}/approve`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setApprovingDeliverableId(null)
  }

  const releaseWave1 = async () => {
    if (!id) return
    setReleasingWave(1)
    try {
      await apiPost(`/api/engagements/${id}/release-wave1`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setReleasingWave(null)
  }

  const markDebriefComplete = async () => {
    if (!id) return
    setDebriefLoading(true)
    try {
      await apiPost(`/api/engagements/${id}/debrief-complete`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setDebriefLoading(false)
  }

  const releaseWave2 = async () => {
    if (!id) return
    setReleasingWave(2)
    try {
      await apiPost(`/api/engagements/${id}/release-deck`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
    } catch {}
    setReleasingWave(null)
  }

  const archiveEngagement = async () => {
    if (!id) return
    setArchiving(true)
    try {
      await apiPost(`/api/engagements/${id}/archive`)
      const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
      setData(d)
      setArchiveDialog(false)
    } catch {}
    setArchiving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !data) {
    return <div className="p-4 bg-red-soft/10 rounded-lg text-red-soft">{error || 'Engagement not found'}</div>
  }

  const client = data.clients
  const nda = data.legal_documents.find(d => d.type === 'nda')
  const agreement = data.legal_documents.find(d => d.type === 'agreement')
  const dossier = data.research_documents.find(d => d.type === 'company_dossier')
  const briefs = data.research_documents.filter(d => d.type === 'interview_brief')
  const currentIdx = ALL_STATUSES.indexOf(data.status)

  // Documents analysis
  const clientDocs = data.documents.filter(d => d.document_type === 'client_upload')
  const uploadedItemKeys = new Set(clientDocs.map(d => d.item_name).filter(Boolean))
  const requiredUploaded = [...REQUIRED_ITEM_KEYS].filter(k => uploadedItemKeys.has(k)).length
  const missingRequired = [...REQUIRED_ITEM_KEYS].filter(k => !uploadedItemKeys.has(k))

  // Group docs by category
  const docsByCategory: Record<string, DocumentRecord[]> = {}
  for (const doc of clientDocs) {
    if (!docsByCategory[doc.category]) docsByCategory[doc.category] = []
    docsByCategory[doc.category].push(doc)
  }

  const isClosed = data.status === 'closed'
  const showUploadLinkButton = !isClosed && UPLOAD_LINK_STATUSES.has(data.status)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-teal text-sm font-medium hover:underline mb-1 inline-block">&larr; All Engagements</Link>
          <h1 className="font-display text-2xl font-bold text-charcoal">{client.company_name}</h1>
          <p className="text-gray-warm text-sm">{client.primary_contact_name} · {statusLabel(data.status)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {showUploadLinkButton && (
            <button
              onClick={sendUploadLink}
              disabled={sendingUploadLink}
              className="px-5 py-2.5 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 text-sm disabled:opacity-50"
            >
              {sendingUploadLink ? 'Sending...' : uploadLinkSent ? 'Resend Upload Link' : 'Send Upload Link'}
            </button>
          )}
          {!isClosed && ['nda_signed', 'discovery_done'].includes(data.status) && (
            <Link to={`/dashboard/engagement/${id}/start`} className="px-5 py-2.5 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 text-sm">
              Start Engagement &rarr;
            </Link>
          )}
          {data.status === 'documents_received' && (
            <button
              onClick={beginPhases}
              disabled={beginLoading}
              className="px-5 py-2.5 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 text-sm disabled:opacity-50"
            >
              {beginLoading ? 'Starting...' : 'Begin Phase 0'}
            </button>
          )}
          {data.status === 'wave_2_released' && (
            <button
              onClick={() => setArchiveDialog(true)}
              className="px-5 py-2.5 bg-charcoal text-white font-semibold rounded-lg hover:bg-charcoal/90 text-sm"
            >
              Archive Engagement
            </button>
          )}
        </div>
      </div>

      {/* Closed Banner */}
      {data.status === 'closed' && (
        <div className="mb-6 p-4 bg-charcoal/5 border-2 border-charcoal/20 rounded-lg flex items-center gap-3">
          <svg className="w-6 h-6 text-charcoal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <div>
            <p className="font-semibold text-charcoal">Engagement Closed &amp; Archived</p>
            <p className="text-sm text-gray-warm">All files have been moved to the archive. This engagement is read-only.</p>
          </div>
        </div>
      )}

      {/* Status Tracker */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
        <h3 className="text-xs font-semibold text-gray-warm uppercase tracking-wider mb-3">Progress</h3>
        <div className="flex flex-wrap gap-1">
          {ALL_STATUSES.map((s, i) => (
            <div
              key={s}
              className={`px-2 py-1 rounded text-xs font-medium ${
                i === currentIdx
                  ? 'bg-crimson text-white'
                  : i < currentIdx
                  ? 'bg-green/10 text-green'
                  : 'bg-gray-light text-gray-warm'
              }`}
            >
              {statusLabel(s)}
            </div>
          ))}
        </div>
      </section>

      {/* Phase Tracker Timeline */}
      {(isInPhases || data.status === 'phases_complete' || data.status === 'debrief' || ALL_STATUSES.indexOf(data.status) > ALL_STATUSES.indexOf('documents_received')) && (
        <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-warm uppercase tracking-wider">Phase Progress</h3>
            {isInPhases && (
              <button
                onClick={handleAdvanceClick}
                className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
              >
                Advance Phase
              </button>
            )}
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {PHASE_INFO.map((p, i) => {
              const completed = data.phase > p.num || data.status === 'phases_complete' || ALL_STATUSES.indexOf(data.status) > ALL_STATUSES.indexOf('phase_7')
              const current = data.phase === p.num && isInPhases
              return (
                <div key={p.num} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      completed
                        ? 'bg-teal border-teal text-white'
                        : current
                        ? 'bg-white border-crimson text-crimson ring-2 ring-crimson/20'
                        : 'bg-white border-gray-light text-gray-warm'
                    }`}>
                      {completed ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : p.num}
                    </div>
                    <span className={`text-xs text-center whitespace-nowrap ${current ? 'font-bold text-crimson' : completed ? 'text-teal font-medium' : 'text-gray-warm'}`}>
                      {p.short}
                    </span>
                    {p.reviewGate && (
                      <span className="text-xs bg-amber/10 text-amber px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {i < PHASE_INFO.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 mt-[-16px] ${completed ? 'bg-teal' : 'bg-gray-light'}`} />
                  )}
                </div>
              )
            })}
          </div>
          {isInPhases && (
            <p className="mt-3 text-sm font-semibold text-charcoal">
              Current: Phase {data.phase} — {PHASE_INFO[data.phase]?.name}
            </p>
          )}
          {data.status === 'phases_complete' && (
            <p className="mt-3 text-sm font-semibold text-teal">All phases complete</p>
          )}
        </section>
      )}

      {/* Current Phase Prompt */}
      {isInPhases && (
        <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-bold text-teal">Phase {data.phase} Prompt</h3>
            <div className="flex gap-2">
              {!promptExpanded && (
                <button
                  onClick={() => { setPromptExpanded(true); loadPhasePrompt() }}
                  className="text-sm text-teal font-semibold hover:underline"
                >
                  View Prompt
                </button>
              )}
              {promptExpanded && (
                <button
                  onClick={() => setPromptExpanded(false)}
                  className="text-sm text-gray-warm font-semibold hover:underline"
                >
                  Collapse
                </button>
              )}
            </div>
          </div>
          {!promptExpanded && (
            <p className="text-sm text-gray-warm">Click "View Prompt" to load the rendered prompt for this engagement.</p>
          )}
          {promptExpanded && (
            <div>
              {promptLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-3 border-teal border-t-transparent rounded-full" />
                </div>
              ) : phasePrompt ? (
                <>
                  <div className="bg-ivory rounded-lg p-4 mb-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-charcoal font-mono leading-relaxed">{phasePrompt.rendered_text}</pre>
                  </div>
                  <button
                    onClick={copyPrompt}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                      copied
                        ? 'bg-teal/10 text-teal'
                        : 'bg-crimson text-white hover:bg-crimson/90'
                    }`}
                  >
                    {copied ? '\u2713 Copied!' : `Copy Phase ${data.phase} Prompt`}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-warm">Failed to load prompt.</p>
              )}
            </div>
          )}
        </section>
      )}
      {!isInPhases && data.status === 'documents_received' && (
        <p className="text-sm text-gray-warm mb-6 px-1">Phase prompts available after beginning Phase 0.</p>
      )}

      {/* Deliverables Section */}
      {data && DELIVERABLE_STATUSES_SHOWING.has(data.status) && (() => {
        const wave1 = data.deliverables.filter(d => d.wave === 1)
        const wave2 = data.deliverables.filter(d => d.wave === 2)
        const allWave1Approved = wave1.length === 4 && wave1.every(d => d.status === 'approved')
        const allWave1Released = wave1.length > 0 && wave1.every(d => d.status === 'released')
        const allWave2Approved = wave2.length === 2 && wave2.every(d => d.status === 'approved')
        const allWave2Released = wave2.length > 0 && wave2.every(d => d.status === 'released')
        const showDebriefButton = (data.status === 'wave_1_released' || allWave1Released) && !data.debrief_complete
        const showReleaseWave2 = data.debrief_complete && allWave2Approved && !allWave2Released

        const renderDeliverableRow = (d: typeof data.deliverables[0]) => (
          <div key={d.id} className="flex items-center gap-3 py-3 px-4 bg-ivory rounded-lg">
            {/* Status icon */}
            <div className="flex-shrink-0">
              {d.status === 'released' ? (
                <span className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
              ) : d.status === 'approved' ? (
                <span className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-gray-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal">{DELIVERABLE_LABELS[d.type] || d.type}</p>
              <p className="text-xs text-gray-warm">
                {d.filename ? d.filename : d.storage_path ? d.storage_path.split('/').pop() : 'No file uploaded'}
              </p>
            </div>

            {/* Status badge */}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              d.status === 'released' ? 'bg-gold/10 text-gold' :
              d.status === 'approved' ? 'bg-green/10 text-green' :
              'bg-gray-light text-gray-warm'
            }`}>
              {d.status === 'released' ? 'Released' : d.status === 'approved' ? 'Approved' : 'Draft'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Upload button */}
              {d.status === 'draft' && (
                <>
                  <input
                    type="file"
                    ref={el => { fileInputRefs.current[d.id] = el }}
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.pptx,.csv"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) uploadDeliverable(d.id, file)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileInputRefs.current[d.id]?.click()}
                    disabled={uploadingDeliverableId === d.id}
                    className="text-xs text-teal font-semibold hover:underline disabled:opacity-50"
                  >
                    {uploadingDeliverableId === d.id ? 'Uploading...' : d.storage_path ? 'Replace' : 'Upload'}
                  </button>
                </>
              )}

              {/* Approve button */}
              {d.status === 'draft' && d.storage_path && (
                <button
                  onClick={() => approveDeliverable(d.id)}
                  disabled={approvingDeliverableId === d.id}
                  className="text-xs bg-teal text-white px-3 py-1 rounded font-semibold hover:bg-teal/90 disabled:opacity-50"
                >
                  {approvingDeliverableId === d.id ? '...' : 'Approve'}
                </button>
              )}
            </div>
          </div>
        )

        return (
          <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
            {data.deliverables.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-warm text-sm mb-3">No deliverable records yet.</p>
                <button
                  onClick={ensureDeliverables}
                  disabled={ensuringDeliverables}
                  className="px-5 py-2.5 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 text-sm disabled:opacity-50"
                >
                  {ensuringDeliverables ? 'Creating...' : 'Create Deliverable Records'}
                </button>
              </div>
            ) : (
              <>
                {/* Wave 1 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-teal">Wave 1 — Core Deliverables</h3>
                    {allWave1Approved && !allWave1Released && (
                      <button
                        onClick={releaseWave1}
                        disabled={releasingWave === 1}
                        className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 disabled:opacity-50"
                      >
                        {releasingWave === 1 ? 'Releasing...' : 'Release Wave 1 to Client'}
                      </button>
                    )}
                    {allWave1Released && (
                      <span className="text-xs font-semibold text-gold bg-gold/10 px-3 py-1 rounded-full">Wave 1 Released</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {wave1.map(renderDeliverableRow)}
                  </div>
                </div>

                {/* Debrief Complete */}
                {showDebriefButton && (
                  <div className="mb-6 p-4 bg-ivory rounded-lg border border-gold/20 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">Executive Debrief</p>
                      <p className="text-xs text-gray-warm">Mark as complete after the client debrief meeting to unlock Wave 2 release.</p>
                    </div>
                    <button
                      onClick={markDebriefComplete}
                      disabled={debriefLoading}
                      className="px-4 py-2 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal/90 disabled:opacity-50"
                    >
                      {debriefLoading ? 'Saving...' : 'Mark Debrief Complete'}
                    </button>
                  </div>
                )}
                {data.debrief_complete && (
                  <div className="mb-6 p-4 bg-green/5 rounded-lg border border-green/20 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm font-semibold text-green">Debrief Completed</span>
                  </div>
                )}

                {/* Wave 2 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg font-bold text-teal">Wave 2 — Post-Debrief Materials</h3>
                    {showReleaseWave2 && (
                      <button
                        onClick={releaseWave2}
                        disabled={releasingWave === 2}
                        className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 disabled:opacity-50"
                      >
                        {releasingWave === 2 ? 'Releasing...' : 'Release Presentation + Retainer Proposal'}
                      </button>
                    )}
                    {allWave2Released && (
                      <span className="text-xs font-semibold text-gold bg-gold/10 px-3 py-1 rounded-full">Wave 2 Released</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {wave2.map(renderDeliverableRow)}
                  </div>
                </div>
              </>
            )}
          </section>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Info */}
        <section className="bg-white rounded-lg border border-gray-light p-5">
          <h3 className="font-display text-lg font-bold text-teal mb-4">Client Information</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Company" value={client.company_name} />
            <Row label="Contact" value={`${client.primary_contact_name} · ${client.primary_contact_email}`} />
            <Row label="Phone" value={client.primary_contact_phone} />
            <Row label="Industry" value={client.industry} />
            <Row label="Revenue" value={client.revenue_range} />
            <Row label="Employees" value={client.employee_count} />
            <Row label="Website" value={client.website_url ? <a href={client.website_url} target="_blank" rel="noreferrer" className="text-teal hover:underline">{client.website_url}</a> : null} />
            <Row label="Referral" value={client.referral_source} />
            {data.pain_points && <Row label="Pain Points" value={data.pain_points} />}
          </dl>
        </section>

        {/* Interview Contacts */}
        <section className="bg-white rounded-lg border border-gray-light p-5">
          <h3 className="font-display text-lg font-bold text-teal mb-4">Interview Contacts</h3>
          {data.interview_contacts.length === 0 ? (
            <p className="text-gray-warm text-sm">No interview contacts provided.</p>
          ) : (
            <div className="space-y-3">
              {data.interview_contacts.map(c => (
                <div key={c.contact_number} className="p-3 bg-ivory rounded-lg text-sm">
                  <p className="font-semibold text-charcoal">{c.name} {c.title && <span className="text-gray-warm font-normal">· {c.title}</span>}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-gray-warm text-xs">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-teal hover:underline">LinkedIn</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Research Dossier */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-teal">Research Dossier</h3>
          <button
            onClick={() => triggerResearch('discovery')}
            disabled={researchLoading === 'discovery'}
            className="text-xs text-teal font-semibold hover:underline disabled:opacity-50"
          >
            {researchLoading === 'discovery' ? 'Running...' : 'Re-run Research'}
          </button>
        </div>
        {dossier ? (
          <div className="prose prose-sm max-w-none text-charcoal whitespace-pre-wrap text-sm leading-relaxed">
            {dossier.content}
          </div>
        ) : (
          <p className="text-gray-warm text-sm">Research pending — will be generated when NDA is signed.</p>
        )}
      </section>

      {/* Interview Briefs */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-teal">Interview Briefs</h3>
          <button
            onClick={() => triggerResearch('interviews')}
            disabled={researchLoading === 'interviews'}
            className="text-xs text-teal font-semibold hover:underline disabled:opacity-50"
          >
            {researchLoading === 'interviews' ? 'Running...' : 'Re-run Interview Research'}
          </button>
        </div>
        {briefs.length > 0 ? (
          <div className="space-y-3">
            {briefs.map((brief, i) => (
              <div key={i} className="border border-gray-light rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedBrief(expandedBrief === brief.contact_name ? null : brief.contact_name)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-ivory/50"
                >
                  <span className="font-semibold text-charcoal text-sm">{brief.contact_name || `Brief ${i + 1}`}</span>
                  <svg className={`w-4 h-4 text-gray-warm transition-transform ${expandedBrief === brief.contact_name ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedBrief === brief.contact_name && (
                  <div className="px-4 pb-4 text-sm text-charcoal whitespace-pre-wrap leading-relaxed border-t border-gray-light pt-3">
                    {brief.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-warm text-sm">Interview briefs will be generated when engagement is started.</p>
        )}
      </section>

      {/* Legal Documents */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <h3 className="font-display text-lg font-bold text-teal mb-4">Legal Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LegalDoc label="NDA" doc={nda} />
          <LegalDoc label="Engagement Agreement" doc={agreement} />
        </div>
      </section>

      {/* Document Inventory — Enhanced */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-teal">Document Inventory</h3>
          <span className="text-sm text-gray-warm">
            <span className="font-bold text-teal">{requiredUploaded}</span> of {REQUIRED_ITEM_KEYS.size} required
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-light rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-teal rounded-full transition-all duration-500"
            style={{ width: `${REQUIRED_ITEM_KEYS.size > 0 ? Math.round((requiredUploaded / REQUIRED_ITEM_KEYS.size) * 100) : 0}%` }}
          />
        </div>

        {clientDocs.length === 0 ? (
          <p className="text-gray-warm text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {CATEGORY_ORDER.map(cat => {
              const catDocs = docsByCategory[cat]
              if (!catDocs || catDocs.length === 0) return null
              return (
                <div key={cat}>
                  <h4 className="text-xs font-semibold text-gray-warm uppercase tracking-wider mb-2">{CATEGORY_LABELS[cat]}</h4>
                  <div className="space-y-1">
                    {catDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 text-sm py-2 px-3 bg-ivory rounded-lg">
                        <svg className="w-4 h-4 text-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-charcoal font-medium truncate">{doc.filename}</p>
                          <p className="text-xs text-gray-warm">
                            {doc.item_name ? (REQUIRED_ITEM_NAMES[doc.item_name] || doc.item_name) : doc.category}
                            {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                            {doc.uploaded_at ? ` · ${formatDate(doc.uploaded_at)}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => downloadDoc(doc.id)}
                          disabled={downloadingDocId === doc.id}
                          className="text-xs text-teal font-semibold hover:underline disabled:opacity-50 flex-shrink-0"
                        >
                          {downloadingDocId === doc.id ? '...' : 'Download'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Document Gaps */}
        {missingRequired.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-light">
            <h4 className="text-xs font-semibold text-amber uppercase tracking-wider mb-2">
              Missing Required Documents ({missingRequired.length})
            </h4>
            <div className="space-y-1">
              {missingRequired.map(key => (
                <div key={key} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-amber/5 border border-amber/20 rounded-lg">
                  <svg className="w-4 h-4 text-amber flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-charcoal">{REQUIRED_ITEM_NAMES[key] || key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Activity Log */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <h3 className="font-display text-lg font-bold text-teal mb-4">Activity Log</h3>
        {data.activity_log.length === 0 ? (
          <p className="text-gray-warm text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {data.activity_log.map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-gray-light last:border-0">
                <span className="text-gray-warm text-xs whitespace-nowrap mt-0.5">{formatTime(log.created_at)}</span>
                <span className="text-charcoal">
                  <span className="font-semibold">{log.actor}</span> — {statusLabel(log.action)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Archive Confirmation Dialog */}
      {archiveDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-crimson" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-display text-lg font-bold text-charcoal">Archive Engagement</h3>
            </div>
            <p className="text-sm text-charcoal mb-4">
              This will archive all files and close the engagement. <strong>This action cannot be undone.</strong> Are you sure?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setArchiveDialog(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-warm hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                onClick={archiveEngagement}
                disabled={archiving}
                className="px-4 py-2 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal/90 disabled:opacity-50"
              >
                {archiving ? 'Archiving...' : 'Yes, Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Phase Dialog */}
      {advanceDialog !== 'none' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            {advanceDialog === 'review' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="font-display text-lg font-bold text-charcoal">Review Gate</h3>
                </div>
                <p className="text-sm text-charcoal mb-4">
                  Phase {data?.phase} ({PHASE_INFO[data?.phase ?? 0]?.name}) is a review gate.
                  Have you reviewed all outputs and confirmed quality? This cannot be undone.
                </p>
                <textarea
                  value={advanceNotes}
                  onChange={e => setAdvanceNotes(e.target.value)}
                  placeholder="Optional review notes..."
                  className="w-full border border-gray-light rounded-lg p-3 text-sm mb-4 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setAdvanceDialog('none'); setAdvanceNotes('') }}
                    className="px-4 py-2 text-sm font-semibold text-gray-warm hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => doAdvance(true)}
                    disabled={advanceLoading}
                    className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 disabled:opacity-50"
                  >
                    {advanceLoading ? 'Advancing...' : 'Yes, Advance'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-charcoal mb-3">Advance Phase</h3>
                <p className="text-sm text-charcoal mb-4">
                  Advance from Phase {data?.phase} to Phase {(data?.phase ?? 0) + 1}?
                </p>
                <textarea
                  value={advanceNotes}
                  onChange={e => setAdvanceNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-light rounded-lg p-3 text-sm mb-4 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setAdvanceDialog('none'); setAdvanceNotes('') }}
                    className="px-4 py-2 text-sm font-semibold text-gray-warm hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => doAdvance(false)}
                    disabled={advanceLoading}
                    className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 disabled:opacity-50"
                  >
                    {advanceLoading ? 'Advancing...' : 'Advance'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-warm w-24 flex-shrink-0">{label}</dt>
      <dd className="text-charcoal">{value || '—'}</dd>
    </div>
  )
}

function LegalDoc({ label, doc }: { label: string; doc?: { status: string; sent_at: string | null; signed_at: string | null } }) {
  return (
    <div className="p-4 bg-ivory rounded-lg">
      <p className="font-semibold text-charcoal text-sm mb-2">{label}</p>
      {doc ? (
        <div className="space-y-1 text-xs">
          <p>
            Status:{' '}
            <span className={`font-semibold ${doc.status === 'signed' ? 'text-green' : doc.status === 'sent' ? 'text-amber' : 'text-gray-warm'}`}>
              {statusLabel(doc.status)}
            </span>
          </p>
          {doc.sent_at && <p className="text-gray-warm">Sent: {formatDate(doc.sent_at)}</p>}
          {doc.signed_at && <p className="text-gray-warm">Signed: {formatDate(doc.signed_at)}</p>}
        </div>
      ) : (
        <p className="text-gray-warm text-xs">Not yet sent</p>
      )}
    </div>
  )
}
