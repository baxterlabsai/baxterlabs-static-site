import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'

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
  documents: Array<{ category: string }>
  research_documents: Array<{
    type: string
    content: string
    contact_name: string | null
    created_at: string
  }>
  deliverables: Array<{ type: string; status: string; wave: number }>
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
  'phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6',
  'debrief', 'wave_1_released', 'wave_2_released', 'closed',
]

function statusLabel(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function EngagementDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [researchLoading, setResearchLoading] = useState('')
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    apiGet<EngagementData>(`/api/engagements/${id}`)
      .then(setData)
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

  // Group documents by category
  const docCounts: Record<string, number> = {}
  for (const doc of data.documents) {
    docCounts[doc.category] = (docCounts[doc.category] || 0) + 1
  }

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
          {['nda_signed', 'discovery_done'].includes(data.status) && (
            <Link to={`/dashboard/engagement/${id}/start`} className="px-5 py-2.5 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 text-sm">
              Start Engagement &rarr;
            </Link>
          )}
        </div>
      </div>

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

      {/* Document Inventory */}
      <section className="bg-white rounded-lg border border-gray-light p-5 mt-6">
        <h3 className="font-display text-lg font-bold text-teal mb-4">Document Inventory</h3>
        {data.documents.length === 0 ? (
          <p className="text-gray-warm text-sm">No documents uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal'].map(cat => (
              <div key={cat} className="p-3 bg-ivory rounded-lg">
                <p className="text-xs font-semibold text-gray-warm uppercase">{cat}</p>
                <p className="text-xl font-bold text-charcoal mt-1">{docCounts[cat] || 0}</p>
              </div>
            ))}
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
