import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversionPreview {
  opportunity_id: string
  company: {
    name: string
    website: string | null
    industry: string | null
    revenue_range: string | null
    employee_count: string | null
    location: string | null
  }
  primary_contact: {
    id: string
    name: string
    email: string | null
    phone: string | null
    title: string | null
    linkedin_url: string | null
  } | null
  all_contacts: Array<{
    id: string
    name: string
    title: string | null
    email: string | null
    phone: string | null
    linkedin_url: string | null
    is_decision_maker: boolean
  }>
  discovery_notes: string | null
  pain_points: string | null
  suggested_fee: number
  suggested_partner_lead: string
  suggested_start_date: string | null
  referral_source: string | null
  already_converted: boolean
  stage: string
}

interface ConversionResult {
  client_id: string
  engagement_id: string
  nda_sent: boolean
  interview_contacts_created: number
  status: string
  message: string
}

interface SelectedContact {
  pipeline_contact_id: string
  contact_number: number
}

// ---------------------------------------------------------------------------
// Revenue range options (matching intake form)
// ---------------------------------------------------------------------------

const REVENUE_OPTIONS = [
  '$1M – $5M',
  '$5M – $10M',
  '$10M – $25M',
  '$25M – $50M',
  '$50M – $100M',
  '$100M+',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConversionReview() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ConversionPreview | null>(null)

  // Editable form state
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [revenueRange, setRevenueRange] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [referralSource, setReferralSource] = useState('')

  const [fee, setFee] = useState('12500')
  const [partnerLead, setPartnerLead] = useState('George DeVries')
  const [startDate, setStartDate] = useState('')
  const [discoveryNotes, setDiscoveryNotes] = useState('')
  const [painPoints, setPainPoints] = useState('')

  // Interview contacts selection
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([])

  // Submission state
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  // Load preview data
  useEffect(() => {
    if (!opportunityId) return
    apiGet<ConversionPreview>(`/api/pipeline/opportunities/${opportunityId}/conversion-preview`)
      .then(data => {
        setPreview(data)
        // Pre-fill form
        setCompanyName(data.company.name || '')
        setContactName(data.primary_contact?.name || '')
        setContactEmail(data.primary_contact?.email || '')
        setContactPhone(data.primary_contact?.phone || '')
        setIndustry(data.company.industry || '')
        setRevenueRange(data.company.revenue_range || '')
        setEmployeeCount(data.company.employee_count || '')
        setWebsiteUrl(data.company.website || '')
        setReferralSource(data.referral_source || '')
        setFee(String(data.suggested_fee))
        setPartnerLead(data.suggested_partner_lead)
        setStartDate(data.suggested_start_date || '')
        setDiscoveryNotes(data.discovery_notes || '')
        setPainPoints(data.pain_points || '')

        // Pre-select contacts: primary contact as #1, decision makers next
        const autoSelected: SelectedContact[] = []
        if (data.primary_contact) {
          autoSelected.push({ pipeline_contact_id: data.primary_contact.id, contact_number: 1 })
        }
        let nextNumber = autoSelected.length + 1
        for (const c of data.all_contacts) {
          if (nextNumber > 3) break
          if (c.id === data.primary_contact?.id) continue
          if (c.is_decision_maker) {
            autoSelected.push({ pipeline_contact_id: c.id, contact_number: nextNumber })
            nextNumber++
          }
        }
        setSelectedContacts(autoSelected)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [opportunityId])

  function toggleContact(contactId: string) {
    setSelectedContacts(prev => {
      const existing = prev.find(s => s.pipeline_contact_id === contactId)
      if (existing) {
        // Remove and re-number remaining
        const filtered = prev.filter(s => s.pipeline_contact_id !== contactId)
        return filtered.map((s, i) => ({ ...s, contact_number: i + 1 }))
      }
      if (prev.length >= 3) return prev
      return [...prev, { pipeline_contact_id: contactId, contact_number: prev.length + 1 }]
    })
  }

  function setContactNumber(contactId: string, num: number) {
    setSelectedContacts(prev => {
      // Swap if another contact has this number
      const existing = prev.find(s => s.contact_number === num && s.pipeline_contact_id !== contactId)
      const current = prev.find(s => s.pipeline_contact_id === contactId)
      if (!current) return prev
      return prev.map(s => {
        if (s.pipeline_contact_id === contactId) return { ...s, contact_number: num }
        if (existing && s.pipeline_contact_id === existing.pipeline_contact_id) return { ...s, contact_number: current.contact_number }
        return s
      })
    })
  }

  async function handleConvert(sendNda: boolean) {
    if (!opportunityId) return
    setConverting(true)
    setConvertError('')
    try {
      const result = await apiPost<ConversionResult>(`/api/pipeline/opportunities/${opportunityId}/convert`, {
        fee: parseFloat(fee) || 12500,
        partner_lead: partnerLead,
        preferred_start_date: startDate || null,
        discovery_notes_override: discoveryNotes || null,
        pain_points_override: painPoints || null,
        interview_contacts: selectedContacts.length > 0 ? selectedContacts : null,
        send_nda: sendNda,
        referral_source: referralSource || null,
      })
      navigate(`/dashboard/engagement/${result.engagement_id}`, {
        state: { toast: `Engagement created for ${companyName}` },
      })
    } catch (err: unknown) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert opportunity')
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg text-red-soft text-sm">{error}</div>
        <Link to="/dashboard/pipeline" className="text-teal text-sm hover:underline mt-4 inline-block">Back to Pipeline</Link>
      </div>
    )
  }

  if (preview?.already_converted) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg text-charcoal text-sm">
          This opportunity has already been converted to an engagement.
        </div>
        <Link to="/dashboard/pipeline" className="text-teal text-sm hover:underline mt-4 inline-block">Back to Pipeline</Link>
      </div>
    )
  }

  const allowedStages = ['won', 'negotiation', 'proposal_sent']
  if (preview && !allowedStages.includes(preview.stage)) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg text-charcoal text-sm">
          Opportunity must be in Won, Negotiation, or Proposal Sent stage to convert. Current stage: {preview.stage.replace(/_/g, ' ')}.
        </div>
        <Link to="/dashboard/pipeline" className="text-teal text-sm hover:underline mt-4 inline-block">Back to Pipeline</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/dashboard/pipeline" className="text-teal text-sm hover:underline flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Pipeline
        </Link>
        <h1 className="font-display text-2xl font-bold text-charcoal">
          Convert to Engagement — {companyName}
        </h1>
        <p className="text-gray-warm text-sm mt-1">
          Review and adjust the data below, then convert this opportunity into an engagement.
        </p>
      </div>

      {convertError && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg text-red-soft text-sm">
          {convertError}
        </div>
      )}

      {/* Two-column form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Client & Company */}
        <div className="bg-white rounded-lg border border-gray-light p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-charcoal border-b border-gray-light pb-3">Client & Company</h2>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company Name</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Primary Contact Name</label>
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Primary Contact Email</label>
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Primary Contact Phone</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Industry</label>
            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Revenue Range</label>
            <select value={revenueRange} onChange={e => setRevenueRange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
              <option value="">Select...</option>
              {REVENUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Employee Count</label>
            <input type="text" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Website URL</label>
            <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Referral Source</label>
            <input type="text" value={referralSource} onChange={e => setReferralSource(e.target.value)}
              placeholder="e.g., John Smith from Acme Corp"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>
        </div>

        {/* Right: Engagement Setup */}
        <div className="bg-white rounded-lg border border-gray-light p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-charcoal border-b border-gray-light pb-3">Engagement Setup</h2>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Fee ($)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Partner Lead</label>
            <select value={partnerLead} onChange={e => setPartnerLead(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
              <option value="George DeVries">George DeVries</option>
              <option value="Alfonso Cordon">Alfonso Cordon</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Preferred Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Discovery Notes</label>
            <textarea value={discoveryNotes} onChange={e => setDiscoveryNotes(e.target.value)} rows={6}
              placeholder="Extracted from pipeline activities..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Pain Points</label>
            <textarea value={painPoints} onChange={e => setPainPoints(e.target.value)} rows={4}
              placeholder="Identified pain points..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" />
          </div>

          {/* Status badge */}
          <div className="bg-ivory rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-warm">Starting Status:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gold/20 text-charcoal">
                NDA Pending
              </span>
            </div>
            <p className="text-xs text-gray-warm mt-1">Skips intake — data is already captured from the pipeline.</p>
          </div>
        </div>
      </div>

      {/* Interview Contacts */}
      <div className="bg-white rounded-lg border border-gray-light p-6 mb-6">
        <h2 className="font-display text-lg font-bold text-charcoal border-b border-gray-light pb-3 mb-4">
          Interview Contacts
          <span className="text-sm font-normal text-gray-warm ml-2">
            ({selectedContacts.length}/3 selected)
          </span>
        </h2>

        {preview && preview.all_contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-light">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm w-10">Select</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm">Name</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm">Title</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm">Phone</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-warm w-20">Contact #</th>
                </tr>
              </thead>
              <tbody>
                {preview.all_contacts.map(c => {
                  const selected = selectedContacts.find(s => s.pipeline_contact_id === c.id)
                  const isPrimary = c.id === preview.primary_contact?.id
                  const isDisabled = !selected && selectedContacts.length >= 3

                  return (
                    <tr key={c.id} className={`border-b border-gray-light/50 ${selected ? 'bg-teal/5' : ''}`}>
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          disabled={isDisabled}
                          onChange={() => toggleContact(c.id)}
                          className="w-4 h-4 rounded border-gray-light text-teal focus:ring-teal/30"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-charcoal">{c.name}</span>
                          {isPrimary && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal/10 text-teal">Primary</span>
                          )}
                          {c.is_decision_maker && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gold/20 text-charcoal">DM</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-warm">{c.title || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-warm">{c.email || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-warm">{c.phone || '—'}</td>
                      <td className="py-2.5 px-3">
                        {selected && (
                          <select
                            value={selected.contact_number}
                            onChange={e => setContactNumber(c.id, parseInt(e.target.value))}
                            className="w-16 px-2 py-1 rounded border border-gray-light text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30"
                          >
                            <option value={1}>#1</option>
                            <option value={2}>#2</option>
                            <option value={3}>#3</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-warm">No contacts found for this company.</p>
        )}
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-lg border border-gray-light p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <Link to="/dashboard/pipeline" className="text-sm text-gray-warm hover:text-charcoal transition-colors">
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleConvert(false)}
            disabled={converting}
            className="px-5 py-2.5 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Convert Without NDA
          </button>
          <button
            onClick={() => handleConvert(true)}
            disabled={converting || !contactEmail}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {converting ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Converting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
                Convert & Send NDA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
