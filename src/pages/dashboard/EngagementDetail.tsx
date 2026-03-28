import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiPatch, apiUpload, apiDelete } from '../../lib/api'
import { useToast } from '../../components/Toast'
import SEO from '../../components/SEO'
import ResearchModal from '../../components/ResearchModal'
import EngagementContactSlideOver from './EngagementContactSlideOver'
import MarkdownContent from '../../components/MarkdownContent'

interface PhaseOutput {
  id: string
  engagement_id: string
  phase: number
  output_number: number
  name: string
  description: string | null
  file_type: string | null
  destination_folder: string
  storage_path: string | null
  file_size: number | null
  status: string
  is_review_gate: boolean
  is_client_deliverable: boolean
  wave: number | null
  uploaded_at: string | null
  accepted_at: string | null
  accepted_by: string | null
  download_url?: string | null
}

interface PhaseOutputContent {
  id: string
  engagement_id: string
  phase_number: number
  output_number: number
  output_name: string
  output_type: string
  content_md: string | null
  storage_path: string | null
  storage_path_url: string | null
  pdf_storage_path: string | null
  pdf_storage_path_url: string | null
  version: number
  status: string
  created_at: string
  updated_at: string
  docx_path: string | null
  docx_pdf_preview_path: string | null
  docx_pdf_preview_path_url: string | null
  pdf_preview_path: string | null
  pdf_preview_path_url: string | null
  pdf_approved: boolean
  pptx_path: string | null
  pptx_path_url: string | null
  xlsx_path: string | null
  xlsx_link: string | null
}

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
  onboarding_token: string | null
  onboarding_completed_at: string | null
  document_contact_name: string | null
  document_contact_title: string | null
  document_contact_email: string | null
  document_contact_phone: string | null
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
    id: string
    contact_number: number
    name: string
    title: string | null
    email: string | null
    phone: string | null
    linkedin_url: string | null
    context_notes: string | null
    role: string
    enrichment_data: Record<string, any> | null
    call_notes_doc_url: string | null
    transcript_document_id: string | null
  }>
  legal_documents: Array<{
    id: string
    type: string
    status: string
    docusign_envelope_id: string | null
    sent_at: string | null
    signed_at: string | null
    signed_pdf_path: string | null
  }>
  documents: DocumentRecord[]
  research_documents: Array<{
    type: string
    content: string
    contact_name: string | null
    created_at: string
  }>
  debrief_complete: boolean
  phase_outputs: PhaseOutput[]
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
  'intake', 'discovery_done', 'agreement_pending', 'agreement_signed',
  'documents_pending', 'documents_received',
  'phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6', 'phase_7', 'phases_complete',
  'debrief', 'wave_1_released', 'wave_2_released', 'closed',
]

const PHASE_INFO = [
  { num: 1, name: 'Data Intake & Baseline', short: 'Intake', reviewGate: true },
  { num: 2, name: 'Leadership Interviews', short: 'Interviews' },
  { num: 3, name: 'Profit Leak Quantification', short: 'Quantify', reviewGate: true },
  { num: 4, name: 'Optimization Analysis', short: 'Optimize' },
  { num: 5, name: 'Report Assembly', short: 'Reports' },
  { num: 6, name: 'Quality Control', short: 'QC', reviewGate: true },
  { num: 7, name: 'Close & Archive', short: 'Archive', reviewGate: true },
]

const PHASE_NAMES: Record<number, string> = {
  1: 'Data Intake & Financial Baseline',
  2: 'Leadership Interviews',
  3: 'Profit Leak Quantification',
  4: 'Optimization Analysis',
  5: 'Report Assembly & Retainer Proposal',
  6: 'Quality Control',
  7: 'Engagement Close & Archive',
}

const REVIEW_GATE_PHASES = new Set([1, 3, 6, 7])

const FILE_TYPE_ICONS: Record<string, string> = {
  docx: 'W', xlsx: 'X', pptx: 'P', md: 'M', pdf: 'PDF',
}

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
  payroll: 'B. Payroll & Headcount',
  vendor: 'C. Vendor & Software Spend',
  revenue: 'D. Revenue & Billing',
  operations: 'E. Operations & Process',
  legal: 'F. Legal & Governance',
}

const CATEGORY_ORDER = ['financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal']

// The 11 required item keys (must match backend checklist)
const REQUIRED_ITEM_KEYS = new Set([
  'pnl_statement', 'balance_sheet', 'trial_balance',
  'payroll_summary', 'org_chart',
  'ap_aging', 'vendor_list', 'software_subscriptions',
  'revenue_by_customer', 'invoicing_billing', 'ar_aging',
])

const REQUIRED_ITEM_NAMES: Record<string, string> = {
  pnl_statement: 'Profit & Loss Statement',
  balance_sheet: 'Balance Sheet',
  trial_balance: 'Trial Balance',
  payroll_summary: 'Payroll Summary Report',
  org_chart: 'Org Chart',
  ap_aging: 'Accounts Payable Aging',
  vendor_list: 'Vendor List with Spend',
  software_subscriptions: 'Software Subscriptions',
  revenue_by_customer: 'Revenue by Customer / Account',
  invoicing_billing: 'Invoicing & Billing Records',
  ar_aging: 'Accounts Receivable Aging',
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
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)
  const [copiedCommand, setCopiedCommand] = useState<number | null>(null)
  const [beginLoading, setBeginLoading] = useState(false)
  const [uploadingDeliverableId, setUploadingDeliverableId] = useState<string | null>(null)
  const [approvingDeliverableId, setApprovingDeliverableId] = useState<string | null>(null)
  const [releasingWave, setReleasingWave] = useState<1 | 2 | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [ensuringDeliverables, setEnsuringDeliverables] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [activityLogOpen, setActivityLogOpen] = useState(false)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [invoicesOpen, setInvoicesOpen] = useState(false)
  const [followUpsOpen, setFollowUpsOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reminderLoading, setReminderLoading] = useState<string | null>(null)
  const [lastReminders, setLastReminders] = useState<{ agreement: string; documents: string }>({ agreement: '', documents: '' })
  const [transcriptIntel, setTranscriptIntel] = useState<Array<{ contact_name: string; contact_title: string | null; analysis: { summary: string; key_findings: string[]; financial_indicators: string[]; notable_quotes: Array<{ quote: string; context: string }> } | null; citation: string; analyzed: boolean }>>([])
  const [dossierModalOpen, setDossierModalOpen] = useState(false)
  const [expandedOutput, setExpandedOutput] = useState<PhaseOutputContent | null>(null)

  // Phase output content (Cowork-synced)
  const [phaseOutputContent, setPhaseOutputContent] = useState<PhaseOutputContent[]>([])

  // Phases where ALL outputs are approved
  const completedPhases: number[] = (() => {
    const byPhase: Record<number, PhaseOutputContent[]> = {}
    for (const p of phaseOutputContent) {
      if (!byPhase[p.phase_number]) byPhase[p.phase_number] = []
      byPhase[p.phase_number].push(p)
    }
    return Object.entries(byPhase)
      .filter(([, outputs]) => outputs.every(o => o.status === 'approved'))
      .map(([num]) => Number(num))
      .sort((a, b) => a - b)
  })()

  // Next phase to run (1–7). If all 7 complete, returns null.
  const nextPhase: number | null = (() => {
    for (let i = 1; i <= 7; i++) {
      if (!completedPhases.includes(i)) return i
    }
    return null
  })()

  const [pocExpandedPhases, setPocExpandedPhases] = useState<Set<number>>(new Set())
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null)
  const [showSourceContentIds, setShowSourceContentIds] = useState<Set<string>>(new Set())
  const [editInstruction, setEditInstruction] = useState('')
  const [approvingOutputId, setApprovingOutputId] = useState<string | null>(null)
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null)
  const [qcResults, setQcResults] = useState<Record<string, { status: string; figures_checked: number; corrections_made: number; corrections: Array<{ location: string; was: string; now: string }>; re_render_needed?: boolean }>>({})
  const [expandedQcId, setExpandedQcId] = useState<string | null>(null)
  const [copiedEdit, setCopiedEdit] = useState<string | null>(null)
  const [copiedSendDeliverables, setCopiedSendDeliverables] = useState(false)
  const [viewingVersionsId, setViewingVersionsId] = useState<string | null>(null)
  const [versionHistory, setVersionHistory] = useState<Array<{ id: string; version: number; status: string; content_md: string | null; created_at: string }>>([])
  const [viewingVersionContent, setViewingVersionContent] = useState<string | null>(null)
  const [resendingInterviewId, setResendingInterviewId] = useState<string | null>(null)
  const [resendConfirmContact, setResendConfirmContact] = useState<{ id: string; name: string; email: string } | null>(null)

  // Delivery command copy state
  const [copiedDeliveryCmd, setCopiedDeliveryCmd] = useState<string | null>(null)

  // Format review state (docx/pptx tracks)
  const [formatFixOutputId, setFormatFixOutputId] = useState<string | null>(null)
  const [formatFixInstruction, setFormatFixInstruction] = useState('')
  const [copiedFormatFix, setCopiedFormatFix] = useState<string | null>(null)
  const [approvingFormatId, setApprovingFormatId] = useState<string | null>(null)

  // Render deliverables state (clipboard copy)

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Pipeline source and referrals
  const [pipelineSource, setPipelineSource] = useState<{ id: string; company_id: string } | null>(null)
  const [referralsGenerated, setReferralsGenerated] = useState<Array<{ id: string; title: string; stage: string; estimated_value: number | null; pipeline_companies: { id: string; name: string } | null }>>([])

  // Invoices
  const [invoices, setInvoices] = useState<Array<{ id: string; invoice_number: string; type: string; amount: number; status: string; payment_link: string | null; issued_at: string; due_date: string; paid_at: string | null }>>([])
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [resendingInvoiceId, setResendingInvoiceId] = useState<string | null>(null)
  const [voidingInvoiceId, setVoidingInvoiceId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)

  // Follow-ups
  const [followUps, setFollowUps] = useState<Array<{ id: string; touchpoint: string; status: string; scheduled_date: string; sent_at: string | null; skipped_at: string | null; snoozed_until: string | null }>>([])
  const [followUpActionLoading, setFollowUpActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    // Check if engagement was created from pipeline
    apiGet<{ opportunities: Array<{ id: string; company_id: string; converted_engagement_id: string | null }> }>('/api/pipeline/opportunities')
      .then(data => {
        const source = data.opportunities.find(o => o.converted_engagement_id === id)
        if (source) setPipelineSource({ id: source.id, company_id: source.company_id })
      })
      .catch(() => {})
    // Fetch referrals generated from this engagement
    apiGet<{ opportunities: Array<{ id: string; title: string; stage: string; estimated_value: number | null; referred_by_engagement_id: string | null; pipeline_companies: { id: string; name: string } | null }> }>('/api/pipeline/opportunities')
      .then(data => {
        const refs = data.opportunities.filter(o => o.referred_by_engagement_id === id)
        setReferralsGenerated(refs)
      })
      .catch(() => {})
    // Fetch invoices
    apiGet<{ invoices: typeof invoices }>(`/api/engagements/${id}/invoices`)
      .then(data => setInvoices(data.invoices))
      .catch(() => {})
    // Fetch follow-ups
    apiGet<{ follow_ups: typeof followUps }>(`/api/engagements/${id}/follow-ups`)
      .then(data => setFollowUps(data.follow_ups))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    apiGet<EngagementData>(`/api/engagements/${id}`)
      .then(async (d) => {
        setData(d)
        // Auto-seed phase outputs if empty
        if (!d.phase_outputs || d.phase_outputs.length === 0) {
          try {
            await apiPost(`/api/engagements/${id}/seed-outputs`)
            const refreshed = await apiGet<EngagementData>(`/api/engagements/${id}`)
            setData(refreshed)
          } catch {
            // Seed failed (maybe table doesn't exist or auth issue) — non-blocking
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    // Fetch last reminder timestamps
    apiGet<{ agreement: string; documents: string }>(`/api/engagements/${id}/reminders/last`)
      .then(setLastReminders)
      .catch(() => {})
    // Fetch transcript intelligence
    apiGet<{ contacts: typeof transcriptIntel }>(`/api/engagements/${id}/transcript-intelligence`)
      .then(res => setTranscriptIntel(res.contacts || []))
      .catch(() => {})
    // Fetch phase output content (Cowork-synced)
    apiGet<{ outputs: PhaseOutputContent[] }>(`/api/engagements/${id}/phase-output-content`)
      .then(res => {
        setPhaseOutputContent(res.outputs || [])
        // Auto-expand the active phase
      })
      .catch(() => {})
  }, [id])

  const triggerResearch = async (type: 'discovery' | 'interviews') => {
    if (!id) return
    setResearchLoading(type)
    try {
      await apiPost(type === 'discovery' ? `/api/engagements/${id}/enrich-research` : `/api/engagements/${id}/research/${type}`)
      toast(type === 'discovery' ? 'Research enriched — new findings merged with existing dossier' : 'Interview research started', 'success')
      // Re-fetch engagement data after a delay to pick up results
      setTimeout(async () => {
        try {
          const d = await apiGet<EngagementData>(`/api/engagements/${id}`)
          setData(d)
        } catch {}
      }, 5000)
    } catch (err) {
      toast(type === 'discovery' ? `Enrich failed — existing research preserved` : `Research failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
    setResearchLoading('')
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

  const getPhaseCommand = (phase: number) => {
    if (!data) return ''
    return `/run-phase ${data.clients.company_name} ${phase}`
  }

  const copyPhaseCommand = async (phase: number) => {
    const cmd = getPhaseCommand(phase)
    try {
      await navigator.clipboard.writeText(cmd)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedCommand(phase)
    toast(`Copied: ${cmd}`)
    setTimeout(() => setCopiedCommand(null), 2000)
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

  const deleteEngagement = async () => {
    if (!id) return
    setDeleting(true)
    try {
      const result = await apiDelete<{ message: string }>(`/api/engagements/${id}`)
      toast(result.message || 'Engagement permanently deleted.', 'success')
      navigate('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete engagement.'
      toast(message, 'error')
    }
    setDeleting(false)
  }

  const sendReminder = async (type: 'agreement' | 'documents') => {
    if (!id) return
    setReminderLoading(type)
    try {
      await apiPost(`/api/engagements/${id}/remind/${type}`)
      // Refresh last reminder timestamps
      const reminders = await apiGet<{ agreement: string; documents: string }>(`/api/engagements/${id}/reminders/last`)
      setLastReminders(reminders)
    } catch {}
    setReminderLoading(null)
  }

  const isReminderDisabled = (type: 'agreement' | 'documents') => {
    const last = lastReminders[type]
    if (!last) return false
    const diff = Date.now() - new Date(last).getTime()
    return diff < 24 * 60 * 60 * 1000
  }

  const formatReminderTime = (ts: string) => {
    if (!ts) return ''
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const togglePocPhase = (phase: number) => {
    setPocExpandedPhases(prev => {
      const next = new Set(prev)
      const sentinel = -(phase + 1)
      if (next.has(phase)) {
        next.delete(phase)
        next.add(sentinel)
      } else if (next.has(sentinel)) {
        next.delete(sentinel)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  const refreshPhaseOutputContent = async () => {
    if (!id) return
    try {
      const res = await apiGet<{ outputs: PhaseOutputContent[] }>(`/api/engagements/${id}/phase-output-content`)
      setPhaseOutputContent(res.outputs || [])
    } catch {}
  }



  const copyEditCommand = (outputName: string) => {
    const clientName = data?.clients?.company_name || id
    const cmd = `/edit-deliverable ${clientName}\n${editInstruction}`
    navigator.clipboard.writeText(cmd).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopiedEdit(outputName)
    toast(`Copied edit command`)
    setTimeout(() => setCopiedEdit(null), 2000)
  }

  const approveFormat = async (outputId: string, _phaseNumber: number) => {
    setApprovingFormatId(outputId)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)
      let res: { success: boolean; qc_result?: { status: string; figures_checked: number; corrections_made: number; corrections: Array<{ location: string; was: string; now: string }>; re_render_needed: boolean } }
      try {
        res = await apiPatch(`/api/phase-output-content/${outputId}`, { pdf_approved: true })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          toast('Format approved — QC check timed out, manual review recommended', 'info')
          await refreshPhaseOutputContent()
          setApprovingFormatId(null)
          return
        }
        throw err
      } finally {
        clearTimeout(timeout)
      }

      await refreshPhaseOutputContent()

      if (res.qc_result) {
        setQcResults(prev => ({ ...prev, [outputId]: res.qc_result! }))
        if (res.qc_result.status === 'corrected' && res.qc_result.corrections_made > 0) {
          toast(`Content corrected — ${res.qc_result.corrections_made} figure${res.qc_result.corrections_made === 1 ? '' : 's'} fixed. Re-render needed.`, 'info')
          setExpandedQcId(outputId)
        } else if (res.qc_result.status === 'clean') {
          toast(`Format approved — QC passed (${res.qc_result.figures_checked} figures verified)`, 'success')
        } else if (res.qc_result.status === 'error') {
          toast('Format approved — QC check could not run, manual review recommended', 'info')
        } else {
          toast('Format approved', 'success')
        }
      } else {
        toast('Format approved', 'success')
      }
    } catch {
      toast('Approval failed', 'error')
    }
    setApprovingFormatId(null)
  }

  const copyFormatFixCommand = (output: PhaseOutputContent) => {
    const skill = output.output_type === 'pptx' ? 'render-pptx' : 'render-docx'
    const cmd = `/${skill} ${output.id} fix:"${formatFixInstruction}"`
    navigator.clipboard.writeText(cmd).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopiedFormatFix(output.id)
    toast(`Copied: ${cmd}`)
    setFormatFixInstruction('')
    setFormatFixOutputId(null)
    setTimeout(() => setCopiedFormatFix(null), 2000)
  }

  const approveOutput = async (outputId: string) => {
    setApprovingOutputId(outputId)
    try {
      await apiPut(`/api/phase-output-content/${outputId}/approve`)
      await refreshPhaseOutputContent()
      toast('Deliverable approved', 'success')
    } catch {
      toast('Approval failed', 'error')
    }
    setApprovingOutputId(null)
    setApproveConfirmId(null)
  }

  const copyDeliveryCommand = (key: string, cmd: string) => {
    navigator.clipboard.writeText(cmd).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopiedDeliveryCmd(key)
    toast(`Copied: ${cmd}`)
    setTimeout(() => setCopiedDeliveryCmd(null), 2000)
  }

  const copySendDeliverablesCommand = () => {
    const clientName = data?.clients?.company_name || id
    const cmd = `/send-deliverables ${clientName}`
    navigator.clipboard.writeText(cmd).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopiedSendDeliverables(true)
    toast('Copied send-deliverables command')
    setTimeout(() => setCopiedSendDeliverables(false), 2000)
  }

  const resendInterviewEmail = async (contactId: string, contactName: string, contactEmail: string) => {
    if (!id) return
    setResendingInterviewId(contactId)
    try {
      await apiPost(`/api/engagements/${id}/resend-interview-email`, {
        contact_id: contactId,
        contact_name: contactName,
        contact_email: contactEmail,
      })
      toast(`Interview email resent to ${contactName}`, 'success')
    } catch {
      toast('Failed to resend interview email', 'error')
    }
    setResendingInterviewId(null)
    setResendConfirmContact(null)
  }

  const loadVersionHistory = async (outputId: string) => {
    if (viewingVersionsId === outputId) {
      setViewingVersionsId(null)
      return
    }
    try {
      const res = await apiGet<{ versions: typeof versionHistory }>(`/api/phase-output-content/${outputId}/versions`)
      setVersionHistory(res.versions || [])
      setViewingVersionsId(outputId)
      setViewingVersionContent(null)
    } catch {}
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
  const agreement = data.legal_documents.find(d => d.type === 'agreement')
  const dossier = data.research_documents.find(d => d.type === 'company_dossier')
  const currentIdx = (() => {
    const dbIdx = ALL_STATUSES.indexOf(data.status)
    if (phaseOutputContent.length > 0) {
      const phaseIdx = nextPhase !== null
        ? ALL_STATUSES.indexOf(`phase_${nextPhase}`)
        : ALL_STATUSES.indexOf('phases_complete')
      return Math.max(dbIdx, phaseIdx)
    }
    return dbIdx
  })()

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

  return (
    <div className="max-w-5xl">
      <SEO title={`BaxterLabs Advisory — ${client.company_name}`} description={`Engagement detail for ${client.company_name}`} />
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-teal text-sm font-medium hover:underline mb-1 inline-block">&larr; All Engagements</Link>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-charcoal">{client.company_name}</h1>
            {pipelineSource && (
              <Link
                to={`/dashboard/pipeline`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal hover:bg-teal/20 transition-colors"
                title="Created from pipeline opportunity"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                From Pipeline
              </Link>
            )}
          </div>
          <p className="text-gray-warm text-sm">{client.primary_contact_name} · {nextPhase ? `Phase ${nextPhase} in Progress` : 'Phases Complete'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isClosed && (
            <button
              onClick={copySendDeliverablesCommand}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 border text-sm font-semibold rounded-lg transition-colors ${
                copiedSendDeliverables ? 'border-teal bg-teal/10 text-teal' : 'border-teal text-teal hover:bg-teal/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              {copiedSendDeliverables ? 'Copied \u2713' : 'Send Deliverables'}
            </button>
          )}
          {!isClosed && data.status === 'discovery_done' && (
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
              {beginLoading ? 'Starting...' : 'Begin Phase 1'}
            </button>
          )}
          {['phases_complete', 'debrief', 'wave_1_released', 'wave_2_released'].includes(data.status) && (
            <button
              onClick={() => setArchiveDialog(true)}
              className="px-5 py-2.5 bg-charcoal text-white font-semibold rounded-lg hover:bg-charcoal/90 text-sm"
            >
              Archive Engagement
            </button>
          )}
        </div>
      </div>

      {/* Smart Reminder Button — one contextual button based on what the client needs to do next */}
      {!isClosed && (() => {
        // Determine what the client's next required action is
        const agreementDoc = data.legal_documents.find(d => d.type === 'agreement')

        let reminderConfig: { type: 'agreement' | 'documents'; label: string; icon: string } | null = null

        if (agreementDoc && agreementDoc.status === 'sent') {
          reminderConfig = { type: 'agreement', label: 'Remind Client: Sign Agreement', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
        } else if (data.status === 'agreement_pending') {
          reminderConfig = { type: 'agreement', label: 'Remind Client: Sign Agreement', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
        } else if (['agreement_signed', 'documents_pending'].includes(data.status)) {
          reminderConfig = { type: 'documents', label: 'Remind Client: Upload Documents', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' }
        }

        if (!reminderConfig) return null

        const { type, label, icon } = reminderConfig
        const disabled = reminderLoading === type || isReminderDisabled(type)
        const lastTs = lastReminders[type]

        return (
          <div className="mb-6">
            <div className="inline-flex flex-col items-start">
              <button
                onClick={() => sendReminder(type)}
                disabled={disabled}
                title={isReminderDisabled(type) ? 'Reminder already sent in the last 24 hours' : `Send reminder to ${data.clients.primary_contact_email}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-crimson text-crimson text-sm font-semibold rounded-lg hover:bg-crimson/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                {reminderLoading === type ? 'Sending...' : label}
              </button>
              {lastTs && (
                <span className="text-xs text-gray-warm mt-1 ml-1">
                  Last sent: {formatReminderTime(lastTs)}
                  {isReminderDisabled(type) && ' (wait 24h)'}
                </span>
              )}
            </div>
          </div>
        )
      })()}

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
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {PHASE_INFO.map((p, i) => {
              const completed = completedPhases.includes(p.num)
              const current = p.num === nextPhase
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
          {nextPhase === null && (
            <p className="mt-3 text-sm font-semibold text-teal">All phases complete</p>
          )}
        </section>
      )}

      {/* Phase Commands */}
      {!isClosed && (
        <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
          <div className="mb-4">
            <h3 className="font-display text-lg font-bold text-teal">Phase Commands</h3>
            <p className="text-xs text-gray-warm mt-0.5">Copy commands to run in Cowork</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PHASE_INFO.map(({ num }) => {
              const done = completedPhases.includes(num)
              const isNext = num === nextPhase
              return (
                <button
                  key={num}
                  onClick={() => !done && copyPhaseCommand(num)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    copiedCommand === num
                      ? 'bg-teal/10 text-teal border border-teal'
                      : done
                      ? 'bg-gray-light text-gray-warm opacity-40 cursor-default border border-transparent'
                      : isNext
                      ? 'bg-teal text-white border border-teal hover:bg-teal/90'
                      : 'bg-ivory text-teal border border-gray-light opacity-60 hover:opacity-100 hover:bg-teal/5'
                  }`}
                  title={done ? `Phase ${num} complete` : getPhaseCommand(num)}
                >
                  {done ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  )}
                  {copiedCommand === num ? 'Copied!' : `Phase ${num}`}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Phase Outputs — Dynamic Cowork-synced viewer */}
      {data && phaseOutputContent.length > 0 && (() => {
        const PHASE_TIMING: Record<number, string> = {
          1: 'Days 1–3', 2: 'Days 4–6', 3: 'Days 7–9',
          4: 'Days 10–11', 5: 'Days 12–13', 6: 'Pre-Delivery', 7: 'Post-Debrief',
        }

        // Group phase_output_content by phase, sorted by output_number
        const pocByPhase: Record<number, PhaseOutputContent[]> = {}
        for (const o of phaseOutputContent) {
          if (!pocByPhase[o.phase_number]) pocByPhase[o.phase_number] = []
          pocByPhase[o.phase_number].push(o)
        }
        for (const phase of Object.keys(pocByPhase)) {
          pocByPhase[Number(phase)].sort((a, b) => (a.output_number || 1) - (b.output_number || 1))
        }

        const activePhase = nextPhase ?? 8

        return (
          <section className="bg-white rounded-lg border border-gray-light p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-teal">Phase Outputs</h3>
                <p className="text-xs text-gray-warm mt-0.5">
                  {phaseOutputContent.length > 0
                    ? `${phaseOutputContent.length} output${phaseOutputContent.length !== 1 ? 's' : ''} synced from Cowork`
                    : 'Outputs will appear here as phases are completed in Cowork'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7].map(phase => {
                const pocOutputs = pocByPhase[phase] || []

                // Skip phases with no content
                if (pocOutputs.length === 0) return null

                const isGate = REVIEW_GATE_PHASES.has(phase)
                const isActive = phase === activePhase
                const isPocExpanded = pocExpandedPhases.has(phase) || (isActive && !pocExpandedPhases.has(-(phase + 1)))

                return (
                  <div key={phase} className={`border rounded-lg overflow-hidden ${isActive ? 'border-teal' : 'border-gray-light'}`}>
                    {/* Phase header */}
                    <button
                      onClick={() => togglePocPhase(phase)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-ivory/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          completedPhases.includes(phase) ? 'bg-teal text-white' :
                          isActive ? 'bg-crimson text-white' :
                          'bg-gray-light text-gray-warm'
                        }`}>
                          {completedPhases.includes(phase) ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : phase}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-charcoal text-sm">{PHASE_NAMES[phase]}</span>
                            <span className="text-xs text-gray-warm">{PHASE_TIMING[phase]}</span>
                            {isGate && (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber/10 text-amber px-1.5 py-0.5 rounded">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                Review Gate
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-warm mt-0.5">
                            {pocOutputs.length > 0 ? `${pocOutputs.length} output${pocOutputs.length !== 1 ? 's' : ''}` : 'No synced outputs yet'}
                          </p>
                        </div>
                      </div>
                      <svg className={`flex-shrink-0 w-4 h-4 text-gray-warm transition-transform ${isPocExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded content */}
                    {isPocExpanded && (
                      <div className="border-t border-gray-light">
                        {/* Generate Graphics button for Phase 3 */}
                        {phase === 3 && (
                          <div className="px-4 py-3 bg-ivory border-b border-gray-light flex items-center justify-between">
                            <p className="text-sm font-semibold text-charcoal">Generate Graphics (Phase 3b)</p>
                            <button
                              onClick={() => copyDeliveryCommand('generate-graphics', `/generate-graphics ${data?.clients?.company_name || ''}`)}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                                copiedDeliveryCmd === 'generate-graphics' ? 'bg-teal/10 text-teal' : 'bg-teal text-white hover:bg-teal/90'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                              {copiedDeliveryCmd === 'generate-graphics' ? 'Copied!' : 'Copy Generate Graphics Command'}
                            </button>
                          </div>
                        )}

                        {/* Send to Client button for Phase 5 when all deliverables approved */}
                        {phase === 5 && pocOutputs.length > 0 && (() => {
                          const allApproved = pocOutputs.every(o => o.status === 'approved')
                          if (!allApproved) return null
                          return (
                            <div className="px-4 py-3 bg-green/5 border-b border-green/20 flex items-center justify-between">
                              <p className="text-sm font-semibold text-green">All deliverables approved</p>
                              <button
                                onClick={copySendDeliverablesCommand}
                                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                                  copiedSendDeliverables ? 'bg-teal/10 text-teal' : 'bg-teal text-white hover:bg-teal/90'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                {copiedSendDeliverables ? 'Copied!' : 'Copy Send to Client Command'}
                              </button>
                            </div>
                          )
                        })()}

                        {pocOutputs.length > 0 ? (
                          <div className="divide-y divide-gray-light">
                            {pocOutputs.map(output => {
                              const isPhase5Deliverable = phase === 5
                              const isEditing = editingOutputId === output.id

                              return (
                              <div key={output.id} className="px-4 py-4">
                                <div className="flex items-center gap-3 mb-2">
                                  {/* File type icon */}
                                  <span className="w-8 h-8 rounded bg-ivory flex items-center justify-center text-xs font-bold text-gray-warm flex-shrink-0">
                                    {FILE_TYPE_ICONS[output.output_type] || '?'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-charcoal">{output.output_name}</p>
                                    <p className="text-xs text-gray-warm">
                                      .{output.output_type} · Version {output.version}
                                      {output.updated_at ? ` · ${formatDate(output.updated_at)}` : ''}
                                    </p>
                                  </div>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    output.status === 'approved' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                                  }`}>
                                    {output.status === 'approved' ? 'Approved' : 'Draft'}
                                  </span>
                                  {/* Download buttons for binary files */}
                                  {output.output_type !== 'md' && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {output.storage_path_url && (
                                        <a href={output.storage_path_url} target="_blank" rel="noreferrer" className="text-xs text-teal font-semibold hover:underline">
                                          Download
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {/* Expand/pop-out button */}
                                  <button
                                    onClick={() => setExpandedOutput(output)}
                                    className="text-gray-warm hover:text-teal p-1 rounded hover:bg-ivory transition-colors flex-shrink-0"
                                    title="View fullscreen"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                                    </svg>
                                  </button>
                                  {/* Output actions: Approve + Version history */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {output.version > 1 && (
                                      <button
                                        onClick={() => loadVersionHistory(output.id)}
                                        className="text-xs text-gray-warm hover:text-teal font-semibold"
                                      >
                                        {viewingVersionsId === output.id ? 'Hide versions' : `v${output.version}`}
                                      </button>
                                    )}
                                    {output.status === 'draft' && (
                                      <button
                                        onClick={() => setApproveConfirmId(output.id)}
                                        disabled={approvingOutputId === output.id}
                                        className="text-xs bg-green text-white px-3 py-1 rounded font-semibold hover:bg-green/90 disabled:opacity-50"
                                      >
                                        {approvingOutputId === output.id ? '...' : 'Approve'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Approve confirmation dialog */}
                                {approveConfirmId === output.id && (
                                  <div className="mt-2 mb-3 p-3 bg-amber/5 border border-amber/20 rounded-lg flex items-center justify-between">
                                    <p className="text-sm text-charcoal">{isPhase5Deliverable
                                      ? <>Approve <strong>{output.output_name}</strong> for client delivery? This will generate the final PDF.</>
                                      : <>Approve <strong>{output.output_name}</strong>? This marks the output as reviewed and ready for the next phase.</>
                                    }</p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button onClick={() => setApproveConfirmId(null)} className="text-xs text-gray-warm font-semibold px-3 py-1 rounded hover:bg-gray-light">Cancel</button>
                                      <button
                                        onClick={() => approveOutput(output.id)}
                                        disabled={approvingOutputId === output.id}
                                        className="text-xs bg-green text-white px-3 py-1 rounded font-semibold hover:bg-green/90 disabled:opacity-50"
                                      >
                                        {approvingOutputId === output.id ? 'Approving...' : 'Confirm Approve'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* === CONTENT VIEWER === */}
                                {(() => {
                                  const previewUrl = output.docx_pdf_preview_path_url || output.pdf_preview_path_url || output.pdf_storage_path_url
                                  const hasContent = !!(output.content_md && output.content_md.trim().length > 0)
                                  // DEBUG: remove after confirming content_md arrives from API
                                  if (phase === 5) console.log('[ContentViewer]', output.output_name, { output_type: output.output_type, content_md_type: typeof output.content_md, content_md_length: output.content_md?.length ?? 0, hasContent, hasPreview: !!previewUrl, previewUrl })
                                  const hasPreview = !!previewUrl
                                  const hasBoth = hasContent && hasPreview
                                  const showingSource = showSourceContentIds.has(output.id)
                                  const toggleSource = () => setShowSourceContentIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(output.id)) next.delete(output.id)
                                    else next.add(output.id)
                                    return next
                                  })

                                  return (
                                    <>
                                      {/* Rendered file preview (PDF embed) — shown when a rendered file exists */}
                                      {hasPreview && (
                                        <div className="mt-3">
                                          <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-semibold text-gray-warm uppercase tracking-wider">
                                              {output.output_type === 'pptx' ? 'Slide Preview' : 'Format Preview'}
                                            </p>
                                            {hasBoth && (
                                              <button
                                                onClick={toggleSource}
                                                className="text-xs text-teal font-semibold hover:underline"
                                              >
                                                {showingSource ? 'Hide Source Content' : 'View Source Content'}
                                              </button>
                                            )}
                                          </div>
                                          <div className="border border-gray-light rounded-lg overflow-hidden">
                                            <embed src={previewUrl} type="application/pdf" className="w-full h-[600px]" />
                                          </div>
                                        </div>
                                      )}

                                      {/* Format review controls — shown when preview exists but not yet approved */}
                                      {hasPreview && !output.pdf_approved && (
                                        <div className="mt-3 border border-gray-light rounded-lg p-3 bg-ivory/30">
                                          <div className="flex items-center gap-2 mb-2">
                                            <input
                                              type="text"
                                              value={formatFixOutputId === output.id ? formatFixInstruction : ''}
                                              onFocus={() => setFormatFixOutputId(output.id)}
                                              onChange={e => { setFormatFixOutputId(output.id); setFormatFixInstruction(e.target.value) }}
                                              onKeyDown={e => { if (e.key === 'Enter' && formatFixInstruction.trim()) copyFormatFixCommand(output) }}
                                              placeholder={output.output_type === 'pptx'
                                                ? "Describe layout fix — e.g. 'move chart on slide 3 below the bullet points'"
                                                : "Describe formatting fix — e.g. 'title running on to two lines, fix line 45'"}
                                              className="flex-1 border border-gray-light rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                                            />
                                            <button
                                              onClick={() => copyFormatFixCommand(output)}
                                              disabled={formatFixOutputId !== output.id || !formatFixInstruction.trim()}
                                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors flex-shrink-0 ${
                                                copiedFormatFix === output.id ? 'bg-teal/10 text-teal' :
                                                (formatFixOutputId === output.id && formatFixInstruction.trim()) ? 'bg-gold text-white hover:bg-gold/90' : 'bg-gray-light text-gray-warm cursor-not-allowed'
                                              }`}
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                              {copiedFormatFix === output.id ? 'Copied!' : 'Apply Fix'}
                                            </button>
                                          </div>
                                          <button
                                            onClick={() => approveFormat(output.id, output.phase_number)}
                                            disabled={!!approvingFormatId}
                                            className="text-xs bg-green text-white px-3 py-1.5 rounded font-semibold hover:bg-green/90 disabled:opacity-50"
                                          >
                                            {approvingFormatId === output.id
                                              ? (output.phase_number === 5 ? 'Running final QC...' : 'Approving...')
                                              : output.output_type === 'pptx' ? 'Approve Layout' : 'Approve Format'}
                                          </button>
                                        </div>
                                      )}

                                      {/* QC Corrections panel — shown after format approve with corrections */}
                                      {qcResults[output.id] && qcResults[output.id].corrections_made > 0 && (
                                        <div className="mt-3 border border-gold/30 rounded-lg overflow-hidden">
                                          <button
                                            onClick={() => setExpandedQcId(expandedQcId === output.id ? null : output.id)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-gold/5 hover:bg-gold/10 transition-colors"
                                          >
                                            <span className="text-xs font-semibold text-gold">
                                              QC Corrections ({qcResults[output.id].corrections_made} figure{qcResults[output.id].corrections_made === 1 ? '' : 's'} fixed, {qcResults[output.id].figures_checked} checked) — re-render needed
                                            </span>
                                            <svg className={`w-4 h-4 text-gold transition-transform ${expandedQcId === output.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                            </svg>
                                          </button>
                                          {expandedQcId === output.id && (
                                            <div className="px-3 py-2 space-y-2">
                                              {qcResults[output.id].corrections.map((c, i) => (
                                                <div key={i} className="text-xs border-b border-gray-light/50 pb-2 last:border-0 last:pb-0">
                                                  <p className="text-gray-warm mb-1">{c.location}</p>
                                                  <p><span className="text-crimson line-through">{c.was}</span> <span className="text-green font-semibold">{c.now}</span></p>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Format/Layout approved badge + download links */}
                                      {hasPreview && output.pdf_approved && !(qcResults[output.id]?.re_render_needed) && (
                                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green bg-green/10 px-2.5 py-1 rounded-full">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            {output.output_type === 'pptx' ? 'Layout Approved' : 'Format Approved'}
                                          </span>
                                          {output.pptx_path_url && (
                                            <a href={output.pptx_path_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-teal font-semibold hover:underline">
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                              Download .pptx
                                            </a>
                                          )}
                                        </div>
                                      )}

                                      {/* Inline markdown content — shown when content_md exists and no rendered preview, OR via toggle */}
                                      {hasContent && (!hasPreview || showingSource) && (
                                        <div className={`mt-3 border border-gray-light rounded-lg p-4 bg-ivory/30 max-h-[600px] overflow-y-auto ${hasPreview ? 'border-teal/20' : ''}`}>
                                          {hasPreview && <p className="text-xs font-semibold text-gray-warm uppercase tracking-wider mb-2">Source Content</p>}
                                          <MarkdownContent content={output.content_md!} />
                                        </div>
                                      )}

                                      {/* XLSX: Open in Excel link */}
                                      {output.output_type === 'xlsx' && (
                                        <div className="mt-3">
                                          {output.xlsx_link ? (
                                            <a
                                              href={output.xlsx_link}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal/90 transition-colors"
                                            >
                                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                              </svg>
                                              Open in Excel
                                            </a>
                                          ) : !hasContent && (
                                            <p className="text-xs text-gray-warm italic">Workbook generating&hellip;</p>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}

                                {/* Edit deliverable interface (content edits — applies to md/docx/pptx, not xlsx) */}
                                {output.output_type !== 'xlsx' && (output.status === 'draft' || output.status === 'approved') && (
                                  <div className="mt-3">
                                    {isEditing ? (
                                      <div className="border border-gray-light rounded-lg p-3 bg-ivory/30">
                                        <textarea
                                          value={editInstruction}
                                          onChange={e => setEditInstruction(e.target.value)}
                                          placeholder="Describe what you want to change — e.g. 'Soften the tone in the third paragraph of the Financial Visibility section' or 'Change the revenue figure in the headline to $2.4M'"
                                          className="w-full border border-gray-light rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
                                          rows={3}
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                          <button
                                            onClick={() => copyEditCommand(output.output_name)}
                                            disabled={!editInstruction.trim()}
                                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                                              copiedEdit === output.output_name ? 'bg-teal/10 text-teal' :
                                              editInstruction.trim() ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-light text-gray-warm cursor-not-allowed'
                                            }`}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                            {copiedEdit === output.output_name ? 'Copied!' : 'Copy Edit Command'}
                                          </button>
                                          <button onClick={() => { setEditingOutputId(null); setEditInstruction('') }} className="text-xs text-gray-warm font-semibold hover:underline">
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => { setEditingOutputId(output.id); setEditInstruction('') }}
                                        className="text-xs text-teal font-semibold hover:underline"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Version history for Phase 5 deliverables */}
                                {isPhase5Deliverable && viewingVersionsId === output.id && versionHistory.length > 0 && (
                                  <div className="mt-3 border border-gray-light rounded-lg overflow-hidden">
                                    <div className="px-3 py-2 bg-ivory/50 border-b border-gray-light">
                                      <p className="text-xs font-semibold text-charcoal">Version History</p>
                                    </div>
                                    <div className="divide-y divide-gray-light">
                                      {versionHistory.map(v => (
                                        <div key={v.id} className="px-3 py-2 flex items-center gap-3">
                                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            v.status === 'approved' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'
                                          }`}>
                                            v{v.version}
                                          </span>
                                          <span className="text-xs text-gray-warm flex-1">{formatDate(v.created_at)}</span>
                                          {v.content_md && (
                                            <button
                                              onClick={() => setViewingVersionContent(viewingVersionContent === v.id ? null : v.id)}
                                              className="text-xs text-teal font-semibold hover:underline"
                                            >
                                              {viewingVersionContent === v.id ? 'Hide' : 'View'}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {/* Inline view of a selected prior version */}
                                    {viewingVersionContent && (() => {
                                      const ver = versionHistory.find(v => v.id === viewingVersionContent)
                                      if (!ver || !ver.content_md) return null
                                      return (
                                        <div className="border-t border-gray-light p-4 bg-ivory/30 max-h-[400px] overflow-y-auto">
                                          <p className="text-xs font-semibold text-gray-warm mb-2">Version {ver.version} (read-only)</p>
                                          <MarkdownContent content={ver.content_md} />
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                              </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* Render Deliverables — appears after Phase 6 QC is complete */}
      {data && completedPhases.includes(6) && (() => {
        const phase5Outputs = phaseOutputContent
          .filter(o => o.phase_number === 5 && o.status === 'approved')
          .sort((a, b) => (a.output_number || 1) - (b.output_number || 1))
        if (phase5Outputs.length === 0) return null
        const clientName = data.clients?.company_name || ''
        return (
          <section className="bg-white rounded-lg border border-teal p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-teal">Render Deliverables</h3>
                <p className="text-xs text-gray-warm mt-0.5">
                  QC complete — render each deliverable to produce the final .docx / .pptx files
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {phase5Outputs.map(output => {
                const renderSkill = output.output_type === 'pptx' ? 'render-pptx' : output.output_type === 'xlsx' ? 'render-xlsx' : 'render-docx'
                return (
                  <div key={output.id} className="flex items-center justify-between px-4 py-3 bg-ivory rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded bg-white flex items-center justify-center text-xs font-bold text-gray-warm flex-shrink-0">
                        {FILE_TYPE_ICONS[output.output_type] || '?'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{output.output_name}</p>
                        <p className="text-xs text-gray-warm">.{output.output_type} · Version {output.version}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyDeliveryCommand(`render-${output.id}`, `/${renderSkill} ${clientName} "${output.output_name}"`)}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold transition-colors flex-shrink-0 ${
                        copiedDeliveryCmd === `render-${output.id}`
                          ? 'bg-teal/10 text-teal'
                          : 'bg-gold text-white hover:bg-gold/90'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      {copiedDeliveryCmd === `render-${output.id}` ? 'Copied!' : 'Render'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-teal">Interview Contacts</h3>
            <div className="flex items-center gap-2">
              {data.onboarding_completed_at ? (
                <span className="text-xs text-green font-semibold bg-green/10 px-2 py-1 rounded">
                  Submitted {formatDate(data.onboarding_completed_at)}
                </span>
              ) : data.onboarding_token ? (
                <span className="text-xs text-amber font-semibold bg-amber/10 px-2 py-1 rounded">
                  Awaiting — link sent
                </span>
              ) : null}
            </div>
          </div>
          {data.onboarding_token && (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/onboard/${data.onboarding_token}`
                  navigator.clipboard.writeText(url)
                  toast('Onboarding link copied to clipboard')
                }}
                className="text-xs text-teal font-semibold hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Onboarding Link
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiPost(`/api/onboard/${data.onboarding_token}/resend`)
                    toast('Onboarding email resent', 'success')
                  } catch {
                    toast('Failed to resend email', 'error')
                  }
                }}
                className="text-xs text-teal font-semibold hover:underline flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Resend Email
              </button>
            </div>
          )}
          {data.interview_contacts.length === 0 ? (
            <p className="text-gray-warm text-sm">No interview contacts provided.</p>
          ) : (
            <div className="space-y-3">
              {data.interview_contacts.map(c => (
                <div
                  key={c.id || c.contact_number}
                  className="p-3 bg-ivory rounded-lg text-sm cursor-pointer hover:bg-ivory/80 transition-colors"
                  onClick={() => c.id && setSelectedContactId(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-charcoal">{c.name} {c.title && <span className="text-gray-warm font-normal">· {c.title}</span>}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {c.enrichment_data?.research && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green/10 text-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-green" />
                          Research
                        </span>
                      )}
                      {c.enrichment_data?.call_prep && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber/10 text-amber">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                          Prep
                        </span>
                      )}
                      {c.call_notes_doc_url && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Notes
                        </span>
                      )}
                      {c.transcript_document_id && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal/10 text-teal">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                          Transcript
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-gray-warm text-xs">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                  {c.context_notes && <p className="mt-2 text-xs text-charcoal italic">{c.context_notes}</p>}
                  {/* Resend Interview Email button */}
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    {resendConfirmContact?.id === c.id ? (
                      <div className="flex items-center gap-2 p-2 bg-amber/5 border border-amber/20 rounded">
                        <p className="text-xs text-charcoal flex-1">Resend interview scheduling email to {c.name}{c.email ? ` at ${c.email}` : ''}?</p>
                        <button onClick={() => setResendConfirmContact(null)} className="text-xs text-gray-warm font-semibold px-2 py-1 rounded hover:bg-gray-light">Cancel</button>
                        <button
                          onClick={() => resendInterviewEmail(c.id, c.name, c.email || '')}
                          disabled={resendingInterviewId === c.id || !c.email}
                          className="text-xs bg-teal text-white px-3 py-1 rounded font-semibold hover:bg-teal/90 disabled:opacity-50"
                        >
                          {resendingInterviewId === c.id ? 'Sending...' : 'Confirm'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResendConfirmContact({ id: c.id, name: c.name, email: c.email || '' })}
                        disabled={!c.email}
                        className={`text-xs font-semibold flex items-center gap-1 ${c.email ? 'text-teal hover:underline' : 'text-gray-warm cursor-not-allowed'}`}
                        title={c.email ? undefined : 'No email address on file'}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Resend Interview Email
                      </button>
                    )}
                  </div>
                  {/* Cowork command buttons */}
                  <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => copyDeliveryCommand(`research-${c.id}`, `/contact-research ${c.name}`)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border font-semibold transition-colors ${
                        copiedDeliveryCmd === `research-${c.id}` ? 'border-teal bg-teal/10 text-teal' : 'border-gray-light text-teal hover:bg-teal/5'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      {copiedDeliveryCmd === `research-${c.id}` ? 'Copied \u2713' : 'Contact Research'}
                    </button>
                    <button
                      onClick={() => copyDeliveryCommand(`prep-${c.id}`, `/interview-prep ${c.name}`)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border font-semibold transition-colors ${
                        copiedDeliveryCmd === `prep-${c.id}` ? 'border-teal bg-teal/10 text-teal' : 'border-gray-light text-teal hover:bg-teal/5'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      {copiedDeliveryCmd === `prep-${c.id}` ? 'Copied \u2713' : 'Interview Prep'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedContactId && data && (
            <EngagementContactSlideOver
              contactId={selectedContactId}
              engagementId={data.id}
              companyName={data.clients.company_name}
              onClose={() => {
                setSelectedContactId(null)
                // Refresh engagement data to pick up any changes
                if (id) apiGet<EngagementData>(`/api/engagements/${id}`).then(setData).catch(() => {})
              }}
            />
          )}
        </section>

        {/* Document Upload Contact */}
        <section className="bg-white rounded-lg border border-gray-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-teal">Document Upload Contact</h3>
            {data.onboarding_completed_at && data.document_contact_name ? (
              <span className="text-xs text-green font-semibold bg-green/10 px-2 py-1 rounded">
                Upload portal sent to {data.document_contact_name}
              </span>
            ) : (
              <span className="text-xs text-amber font-semibold bg-amber/10 px-2 py-1 rounded">
                Pending — awaiting onboarding
              </span>
            )}
          </div>
          {data.document_contact_name ? (
            <div className="p-3 bg-ivory rounded-lg text-sm">
              <p className="font-semibold text-charcoal">{data.document_contact_name} {data.document_contact_title && <span className="text-gray-warm font-normal">· {data.document_contact_title}</span>}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-gray-warm text-xs">
                {data.document_contact_email && <span>{data.document_contact_email}</span>}
                {data.document_contact_phone && <span>{data.document_contact_phone}</span>}
              </div>
            </div>
          ) : (
            <p className="text-gray-warm text-sm">No document contact designated yet.</p>
          )}
        </section>
      </div>

      {/* Research Dossier */}
      <section className="bg-white rounded-lg border border-gray-light mt-6">
        <button
          onClick={() => setDossierOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/50 transition-colors cursor-pointer"
        >
          <h3 className="font-display text-lg font-bold text-teal">
            Research Dossier{dossier ? '' : ' (empty)'}
          </h3>
          <div className="flex items-center gap-2">
            {dossier && (
              <button
                onClick={e => { e.stopPropagation(); setDossierModalOpen(true) }}
                className="text-gray-warm hover:text-teal p-1 rounded hover:bg-ivory transition-colors"
                aria-label="Expand Research Dossier"
                title="View fullscreen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                </svg>
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); triggerResearch('discovery') }}
              disabled={researchLoading === 'discovery'}
              className="text-xs text-teal font-semibold hover:underline disabled:opacity-50"
            >
              {researchLoading === 'discovery' ? 'Enriching...' : 'Enrich Research'}
            </button>
            <svg className={`w-4 h-4 text-gray-warm transition-transform ${dossierOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {dossierOpen && (
          <div className="px-5 pb-5">
            {dossier ? (
              <div className="text-sm text-charcoal leading-relaxed">
                <MarkdownContent content={dossier.content} />
              </div>
            ) : (
              <p className="text-gray-warm text-sm">Research pending — click "Enrich Research" to generate the company dossier.</p>
            )}
          </div>
        )}
      </section>

      {/* Legal Documents */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <h3 className="font-display text-lg font-bold text-teal mb-4">Legal Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LegalDoc label="Engagement Agreement" doc={agreement} engagementId={id} />
        </div>
      </section>

      {/* Document Inventory — Enhanced */}
      <section className="bg-white rounded-lg border border-gray-light mt-6">
        <button
          onClick={() => setDocsOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/50 transition-colors cursor-pointer"
        >
          <h3 className="font-display text-lg font-bold text-teal">
            Document Inventory
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-warm">
              <span className="font-bold text-teal">{requiredUploaded}</span> of {REQUIRED_ITEM_KEYS.size} required
            </span>
            <svg className={`w-4 h-4 text-gray-warm transition-transform ${docsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {docsOpen && (
          <div className="px-5 pb-5">

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
          </div>
        )}
      </section>

      {/* Referrals Generated */}
      {referralsGenerated.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
          <h3 className="font-display text-lg font-bold text-teal mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Referrals Generated
          </h3>
          <div className="space-y-2">
            {referralsGenerated.map(ref => {
              const stageColors: Record<string, string> = {
                won: 'bg-green/10 text-green',
                lost: 'bg-red-soft/10 text-red-soft',
                dormant: 'bg-gray-light text-gray-warm',
              }
              const badgeClass = stageColors[ref.stage] || 'bg-teal/10 text-teal'
              return (
                <div key={ref.id} className="flex items-center justify-between py-2 border-b border-gray-light/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-charcoal">{ref.pipeline_companies?.name || ref.title}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                      {ref.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-sm text-charcoal font-medium">
                    {ref.estimated_value ? `$${ref.estimated_value.toLocaleString()}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Invoices */}
      <section className="bg-white rounded-lg border border-gray-light mt-6">
        <button
          onClick={() => setInvoicesOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/50 transition-colors cursor-pointer"
        >
          <h3 className="font-display text-lg font-bold text-teal flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            Invoices{invoices.length > 0 ? ` (${invoices.length})` : ''}
          </h3>
          <svg className={`w-4 h-4 text-gray-warm transition-transform ${invoicesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {invoicesOpen && (
          <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-4">
          <span />
          {!isClosed && (
            <div className="flex gap-2">
              {!invoices.some(inv => inv.type === 'deposit' && inv.status !== 'void') && (
                <button
                  disabled={generatingInvoice}
                  onClick={async () => {
                    setGeneratingInvoice(true)
                    try {
                      await apiPost(`/api/engagements/${id}/generate-invoice`, { invoice_type: 'deposit', send_email: true })
                      const updated = await apiGet<{ invoices: typeof invoices }>(`/api/engagements/${id}/invoices`)
                      setInvoices(updated.invoices)
                    } catch {}
                    setGeneratingInvoice(false)
                  }}
                  className="px-3 py-1.5 bg-teal text-white text-xs font-semibold rounded-lg hover:bg-teal/90 disabled:opacity-50"
                >
                  {generatingInvoice ? 'Generating...' : 'Generate Deposit Invoice'}
                </button>
              )}
              {!invoices.some(inv => inv.type === 'final' && inv.status !== 'void') && (
                <button
                  disabled={generatingInvoice}
                  onClick={async () => {
                    setGeneratingInvoice(true)
                    try {
                      await apiPost(`/api/engagements/${id}/generate-invoice`, { invoice_type: 'final', send_email: true })
                      const updated = await apiGet<{ invoices: typeof invoices }>(`/api/engagements/${id}/invoices`)
                      setInvoices(updated.invoices)
                    } catch {}
                    setGeneratingInvoice(false)
                  }}
                  className="px-3 py-1.5 bg-charcoal text-white text-xs font-semibold rounded-lg hover:bg-charcoal/90 disabled:opacity-50"
                >
                  {generatingInvoice ? 'Generating...' : 'Generate Final Invoice'}
                </button>
              )}
            </div>
          )}
        </div>
        {invoices.length === 0 ? (
          <p className="text-gray-warm text-sm">No invoices yet. Deposit invoice is generated when the engagement agreement is signed.</p>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const statusColors: Record<string, string> = {
                sent: 'bg-blue-100 text-blue-800',
                paid: 'bg-green/10 text-green',
                overdue: 'bg-red-soft/10 text-red-soft',
                void: 'bg-gray-light text-gray-warm line-through',
                draft: 'bg-gray-light text-charcoal',
              }
              const isActive = inv.status !== 'void' && inv.status !== 'paid'
              return (
                <div key={inv.id} className="flex items-center justify-between py-3 px-4 border border-gray-light rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-warm">{inv.type === 'deposit' ? 'Deposit (50%)' : 'Final (50%)'}</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[inv.status] || 'bg-gray-light text-charcoal'}`}>
                      {statusLabel(inv.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-charcoal">${Number(inv.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-warm">
                        {inv.paid_at ? `Paid ${formatDate(inv.paid_at)}` : `Due ${formatDate(inv.due_date)}`}
                      </p>
                    </div>
                    {isActive && (
                      <div className="flex gap-1">
                        {inv.payment_link && (
                          <a
                            href={inv.payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-teal hover:bg-teal/10 rounded-md"
                            title="Open payment link"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        )}
                        <button
                          disabled={resendingInvoiceId === inv.id}
                          onClick={async () => {
                            setResendingInvoiceId(inv.id)
                            try { await apiPost(`/api/invoices/${inv.id}/resend`) } catch {}
                            setResendingInvoiceId(null)
                          }}
                          className="p-1.5 text-gray-warm hover:text-charcoal hover:bg-gray-light rounded-md disabled:opacity-50"
                          title="Resend invoice email"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </button>
                        <button
                          disabled={markingPaidId === inv.id}
                          onClick={async () => {
                            setMarkingPaidId(inv.id)
                            try {
                              await apiPost(`/api/invoices/${inv.id}/mark-paid`)
                              const updated = await apiGet<{ invoices: typeof invoices }>(`/api/engagements/${id}/invoices`)
                              setInvoices(updated.invoices)
                            } catch {}
                            setMarkingPaidId(null)
                          }}
                          className="p-1.5 text-green hover:bg-green/10 rounded-md disabled:opacity-50"
                          title="Mark as paid"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </button>
                        <button
                          disabled={voidingInvoiceId === inv.id}
                          onClick={async () => {
                            if (!confirm(`Void invoice ${inv.invoice_number}? This cannot be undone.`)) return
                            setVoidingInvoiceId(inv.id)
                            try {
                              await apiPost(`/api/invoices/${inv.id}/void`)
                              const updated = await apiGet<{ invoices: typeof invoices }>(`/api/engagements/${id}/invoices`)
                              setInvoices(updated.invoices)
                            } catch {}
                            setVoidingInvoiceId(null)
                          }}
                          className="p-1.5 text-red-soft hover:bg-red-soft/10 rounded-md disabled:opacity-50"
                          title="Void invoice"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </div>
        )}
      </section>

      {/* Follow-Up Sequence */}
      {followUps.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-light mt-6">
          <button
            onClick={() => setFollowUpsOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/50 transition-colors cursor-pointer"
          >
            <h3 className="font-display text-lg font-bold text-teal flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Post-Engagement Follow-Ups ({followUps.length})
            </h3>
            <svg className={`w-4 h-4 text-gray-warm transition-transform ${followUpsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {followUpsOpen && (
          <div className="px-5 pb-5 space-y-2">
            {followUps.map(fu => {
              const touchpointLabels: Record<string, string> = { '30_day': '30-Day Check-In', '60_day': '60-Day Pulse Check', '90_day': '90-Day Review Offer' }
              const statusColors: Record<string, string> = {
                scheduled: 'bg-blue-100 text-blue-800',
                sent: 'bg-green/10 text-green',
                skipped: 'bg-gray-light text-gray-warm',
                snoozed: 'bg-amber/20 text-charcoal',
              }
              return (
                <div key={fu.id} className="flex items-center justify-between py-2.5 px-4 border border-gray-light rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-charcoal">{touchpointLabels[fu.touchpoint] || fu.touchpoint}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[fu.status] || 'bg-gray-light text-charcoal'}`}>
                      {statusLabel(fu.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-warm">
                      {fu.sent_at ? `Sent ${formatDate(fu.sent_at)}` : fu.skipped_at ? `Skipped ${formatDate(fu.skipped_at)}` : `Scheduled ${formatDate(fu.scheduled_date)}`}
                    </span>
                    {fu.status === 'scheduled' && (
                      <button
                        disabled={followUpActionLoading === fu.id}
                        onClick={async () => {
                          if (!confirm(`Skip the ${touchpointLabels[fu.touchpoint] || fu.touchpoint} follow-up?`)) return
                          setFollowUpActionLoading(fu.id)
                          try {
                            await apiPatch(`/api/follow-ups/${fu.id}`, { action: 'skip' })
                            setFollowUps(prev => prev.map(f => f.id === fu.id ? { ...f, status: 'skipped', skipped_at: new Date().toISOString() } : f))
                          } catch {}
                          setFollowUpActionLoading(null)
                        }}
                        className="text-xs text-gray-warm hover:text-red-soft font-medium disabled:opacity-50"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </section>
      )}

      {/* Activity Log */}
      <section className="bg-white rounded-lg border border-gray-light mt-6">
        <button
          onClick={() => setActivityLogOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-ivory/50 transition-colors cursor-pointer"
        >
          <h3 className="font-display text-lg font-bold text-teal">
            Activity Log{data.activity_log.length > 0 ? ` (${data.activity_log.length})` : ''}
          </h3>
          <svg className={`w-4 h-4 text-gray-warm transition-transform ${activityLogOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {activityLogOpen && (
          <div className="px-5 pb-5">
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
          </div>
        )}
      </section>

      {/* Actions Section */}
      {!isClosed && (
        <section className="mt-6 pt-6 border-t border-gray-light">
          <h3 className="text-xs font-semibold text-gray-warm uppercase tracking-wider mb-3">Actions</h3>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setArchiveDialog(true)}
              className="px-4 py-2 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal/90 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              Archive Engagement
            </button>
            <button
              onClick={() => setDeleteDialog(true)}
              className="px-4 py-2 border border-red-soft text-red-soft text-sm font-semibold rounded-lg hover:bg-red-soft/5"
            >
              Delete Engagement
            </button>
          </div>
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-red-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-display text-lg font-bold text-charcoal">Permanently Delete Engagement</h3>
            </div>
            <p className="text-sm text-charcoal mb-2">
              This will permanently delete <strong>{data?.clients?.company_name || 'this engagement'}</strong> and all associated data:
            </p>
            <ul className="text-sm text-charcoal mb-3 list-disc pl-5 space-y-0.5">
              <li>Documents & uploaded files</li>
              <li>Deliverables & phase outputs</li>
              <li>Invoices & follow-up sequences</li>
              <li>Research, legal documents & activity log</li>
              <li>Storage files</li>
            </ul>
            <p className="text-sm text-red-soft font-semibold mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteDialog(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-warm hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                onClick={deleteEngagement}
                disabled={deleting}
                className="px-4 py-2 bg-red-soft text-white text-sm font-semibold rounded-lg hover:bg-red-soft/90 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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


      {/* Fullscreen Output Modal */}
      {expandedOutput && (
        <div className="fixed inset-0 z-60 bg-white flex flex-col outline-none">
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-light flex-shrink-0">
            <div>
              <h2 className="text-lg font-display font-bold text-charcoal">{expandedOutput.output_name}</h2>
              <p className="text-xs text-gray-warm">Phase {expandedOutput.phase_number} · .{expandedOutput.output_type} · Version {expandedOutput.version}</p>
            </div>
            <button
              onClick={() => setExpandedOutput(null)}
              className="text-gray-warm hover:text-charcoal p-1 rounded-lg hover:bg-ivory transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            {(() => {
              const previewUrl = expandedOutput.docx_pdf_preview_path_url || expandedOutput.pdf_preview_path_url || expandedOutput.pptx_path_url || expandedOutput.pdf_storage_path_url
              const hasContent = !!(expandedOutput.content_md && expandedOutput.content_md.trim().length > 0)
              if (previewUrl) {
                return <embed src={previewUrl} type="application/pdf" className="w-full h-full min-h-[calc(100vh-140px)]" />
              }
              if (hasContent) {
                return (
                  <div className="prose prose-sm max-w-none text-charcoal">
                    <MarkdownContent content={expandedOutput.content_md!} />
                  </div>
                )
              }
              return <p className="text-gray-warm text-center py-12">No preview available for this output.</p>
            })()}
          </div>
        </div>
      )}

      {/* Fullscreen Research Modals */}
      <ResearchModal
        title="Research Dossier"
        content={dossier?.content || ''}
        isOpen={dossierModalOpen}
        onClose={() => setDossierModalOpen(false)}
      />
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

function LegalDoc({ label, doc, engagementId }: { label: string; engagementId?: string; doc?: { id: string; status: string; docusign_envelope_id: string | null; sent_at: string | null; signed_at: string | null; signed_pdf_path: string | null } }) {
  const handleView = async () => {
    if (!engagementId || !doc) return
    try {
      const res = await apiGet<{ url: string }>(`/api/engagements/${engagementId}/agreements/${doc.id}/view`)
      if (res.url) window.open(res.url, '_blank')
    } catch { /* ignore */ }
  }
  const handleDownload = async () => {
    if (!engagementId || !doc) return
    try {
      const res = await apiGet<{ url: string }>(`/api/engagements/${engagementId}/agreements/${doc.id}/download`)
      if (res.url) window.open(res.url, '_blank')
    } catch { /* ignore */ }
  }
  return (
    <div className="p-4 bg-ivory rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-charcoal text-sm">{label}</p>
        {doc?.status === 'signed' && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green bg-green/10 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Signed
          </span>
        )}
        {doc?.status === 'sent' && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Awaiting Signature
          </span>
        )}
      </div>
      {doc ? (
        <div className="space-y-1.5 text-xs">
          {doc.sent_at && <p className="text-gray-warm">Sent: {formatDate(doc.sent_at)}</p>}
          {doc.signed_at && <p className="text-gray-warm">Signed: {formatDate(doc.signed_at)}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {doc.docusign_envelope_id && (
              <a
                href={`https://app.docusign.com/documents/details/${doc.docusign_envelope_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-teal font-semibold hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                View in DocuSign
              </a>
            )}
            {doc.signed_at && doc.signed_pdf_path && (
              <>
                <button
                  onClick={handleView}
                  className="inline-flex items-center gap-1 text-teal font-semibold hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View PDF
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 text-teal font-semibold hover:underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-warm text-xs">Not yet sent</p>
      )}
    </div>
  )
}
