import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'

interface EngagementData {
  id: string
  status: string
  pain_points: string | null
  clients: {
    company_name: string
    primary_contact_name: string
    primary_contact_email: string
    industry: string | null
    revenue_range: string | null
  }
  research_documents: Array<{ type: string; content: string }>
}

export default function StartEngagement() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [fee, setFee] = useState(12500)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partnerLead, setPartnerLead] = useState('George DeVries')
  const [discoveryNotes, setDiscoveryNotes] = useState('')
  const [showFullDossier, setShowFullDossier] = useState(false)

  useEffect(() => {
    if (!id) return
    apiGet<EngagementData>(`/api/engagements/${id}`)
      .then(d => {
        setData(d)
        // Default start date: tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const start = tomorrow.toISOString().split('T')[0]
        setStartDate(start)
        // Default end: start + 14 days
        const end = new Date(tomorrow)
        end.setDate(end.getDate() + 14)
        setEndDate(end.toISOString().split('T')[0])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-calculate end date when start changes
  useEffect(() => {
    if (startDate) {
      const end = new Date(startDate)
      end.setDate(end.getDate() + 14)
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [startDate])

  const handleStart = async () => {
    if (!id) return
    setSubmitting(true)
    setError('')
    try {
      await apiPost(`/api/engagements/${id}/start`, {
        fee,
        start_date: startDate || null,
        target_end_date: endDate || null,
        partner_lead: partnerLead,
        discovery_notes: discoveryNotes || null,
      })
      navigate(`/dashboard/engagement/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start engagement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-4 bg-red-soft/10 rounded-lg text-red-soft">{error || 'Engagement not found'}</div>
  }

  const client = data.clients
  const dossier = data.research_documents.find(d => d.type === 'company_dossier')

  return (
    <div className="max-w-5xl">
      <Link to={`/dashboard/engagement/${id}`} className="text-teal text-sm font-medium hover:underline mb-2 inline-block">&larr; Back to Engagement</Link>
      <h1 className="font-display text-2xl font-bold text-charcoal mb-1">Start Engagement</h1>
      <p className="text-gray-warm text-sm mb-8">Review the information below, set engagement terms, and start.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Review Panel */}
        <div className="space-y-6">
          {/* Client Summary */}
          <section className="bg-white rounded-lg border border-gray-light p-5">
            <h3 className="font-display text-lg font-bold text-teal mb-3">Client Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-gray-warm w-20">Company</dt><dd className="text-charcoal font-medium">{client.company_name}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-warm w-20">Contact</dt><dd className="text-charcoal">{client.primary_contact_name}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-warm w-20">Email</dt><dd className="text-charcoal">{client.primary_contact_email}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-warm w-20">Industry</dt><dd className="text-charcoal">{client.industry || '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-warm w-20">Revenue</dt><dd className="text-charcoal">{client.revenue_range || '—'}</dd></div>
            </dl>
          </section>

          {/* Pain Points */}
          {data.pain_points && (
            <section className="bg-white rounded-lg border border-gray-light p-5">
              <h3 className="font-display text-lg font-bold text-teal mb-3">Pain Points</h3>
              <p className="text-charcoal text-sm whitespace-pre-wrap">{data.pain_points}</p>
            </section>
          )}

          {/* Research Dossier Preview */}
          <section className="bg-white rounded-lg border border-gray-light p-5">
            <h3 className="font-display text-lg font-bold text-teal mb-3">Research Dossier</h3>
            {dossier ? (
              <>
                <div className={`text-sm text-charcoal whitespace-pre-wrap leading-relaxed ${showFullDossier ? '' : 'max-h-48 overflow-hidden relative'}`}>
                  {dossier.content}
                  {!showFullDossier && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                <button
                  onClick={() => setShowFullDossier(!showFullDossier)}
                  className="mt-2 text-teal text-xs font-semibold hover:underline"
                >
                  {showFullDossier ? 'Collapse' : 'Read Full Dossier'}
                </button>
              </>
            ) : (
              <p className="text-gray-warm text-sm">No research dossier available yet.</p>
            )}
          </section>

          {/* Discovery Notes */}
          <section className="bg-white rounded-lg border border-gray-light p-5">
            <h3 className="font-display text-lg font-bold text-teal mb-3">Discovery Call Notes</h3>
            <textarea
              value={discoveryNotes}
              onChange={e => setDiscoveryNotes(e.target.value)}
              rows={5}
              placeholder="Add notes from the discovery call..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </section>
        </div>

        {/* Right: Engagement Setup */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-light p-5">
            <h3 className="font-display text-lg font-bold text-teal mb-5">Engagement Terms</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Engagement Fee</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-warm">$</span>
                  <input
                    type="number"
                    value={fee}
                    onChange={e => setFee(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Target Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Target End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
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
                  <option>George DeVries</option>
                  <option>Alfonso Cordon</option>
                </select>
              </div>
            </div>
          </section>

          {/* Agreement Preview */}
          <section className="bg-ivory rounded-lg border border-gray-light p-5">
            <h3 className="text-sm font-semibold text-charcoal mb-2">Agreement Preview</h3>
            <p className="text-sm text-gray-warm">
              Engagement Agreement will be sent to <strong className="text-charcoal">{client.primary_contact_name}</strong> at <strong className="text-charcoal">{client.primary_contact_email}</strong> for <strong className="text-charcoal">${fee.toLocaleString()}</strong>.
            </p>
            <p className="text-xs text-gray-warm mt-2">Both client and BaxterLabs will need to sign via DocuSign.</p>
          </section>

          {error && (
            <div className="p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
              <p className="text-red-soft text-sm">{error}</p>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={submitting}
            className="w-full h-14 bg-crimson text-white font-display text-xl font-bold rounded-lg transition-colors hover:bg-crimson/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </>
            ) : 'START ENGAGEMENT'}
          </button>
          <p className="text-xs text-gray-warm text-center">
            This will send the Engagement Agreement to the client and begin interview research.
          </p>
        </div>
      </div>
    </div>
  )
}
