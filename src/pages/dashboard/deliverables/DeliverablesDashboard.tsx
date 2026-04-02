import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import SEO from '../../../components/SEO'

interface EngagementRow {
  id: string
  phase: number
  status: string
  start_date: string | null
  clients: { company_name: string } | null
  outputs: OutputRow[]
}

interface OutputRow {
  id: string
  output_name: string
  output_type: string
  status: string
  phase_number: number
  pdf_approved: boolean
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1 — Data Intake',
  2: 'Phase 2 — Interviews',
  3: 'Phase 3 — Quantification',
  4: 'Phase 4 — Optimization',
  5: 'Phase 5 — Content Assembly',
  6: 'Phase 6 — Quality Control',
  7: 'Phase 7 — Document Packaging',
  8: 'Phase 8 — Archive & Close',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-light', text: 'text-charcoal' },
  in_review: { bg: 'bg-gold/20', text: 'text-charcoal' },
  approved: { bg: 'bg-green/10', text: 'text-green' },
  delivered: { bg: 'bg-teal/10', text: 'text-teal' },
}

export default function DeliverablesDashboard() {
  const [engagements, setEngagements] = useState<EngagementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEngagements()
  }, [])

  async function loadEngagements() {
    const { data: engs } = await supabase
      .from('engagements')
      .select('id, phase, status, start_date, clients(company_name)')
      .eq('is_deleted', false)
      .is('archived_at', null)
      .in('status', ['active', 'onboarding', 'intake'])
      .order('updated_at', { ascending: false })

    if (!engs) { setLoading(false); return }

    const engIds = engs.map(e => e.id)
    const { data: outputs } = await supabase
      .from('phase_output_content')
      .select('id, engagement_id, output_name, output_type, status, phase_number, pdf_approved')
      .in('engagement_id', engIds)
      .order('phase_number', { ascending: true })

    const outputsByEng = new Map<string, OutputRow[]>()
    for (const o of outputs || []) {
      const list = outputsByEng.get(o.engagement_id) || []
      list.push(o)
      outputsByEng.set(o.engagement_id, list)
    }

    setEngagements(
      engs.map(e => ({
        ...e,
        clients: Array.isArray(e.clients) ? e.clients[0] : e.clients,
        outputs: outputsByEng.get(e.id) || [],
      }))
    )
    setLoading(false)
  }

  function countByStatus(outputs: OutputRow[], status: string) {
    return outputs.filter(o => o.status === status).length
  }

  return (
    <>
      <SEO title="Deliverables — BaxterLabs" description="Review and approve engagement outputs" />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-charcoal">Deliverables</h1>
            <p className="text-sm text-gray-warm mt-1">Review and approve engagement outputs</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : engagements.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-light p-12 text-center">
            <p className="text-gray-warm">No active engagements with deliverables</p>
          </div>
        ) : (
          <div className="space-y-4">
            {engagements.map(eng => {
              const draft = countByStatus(eng.outputs, 'draft')
              const inReview = countByStatus(eng.outputs, 'in_review')
              const approved = countByStatus(eng.outputs, 'approved')
              const delivered = countByStatus(eng.outputs, 'delivered')
              const total = eng.outputs.length

              return (
                <Link
                  key={eng.id}
                  to={`/dashboard/deliverables/${eng.id}`}
                  className="block bg-white rounded-xl border border-gray-light hover:border-teal/30 hover:shadow-sm transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-charcoal truncate">
                        {eng.clients?.company_name || 'Unknown Client'}
                      </h2>
                      <p className="text-sm text-gray-warm mt-0.5">
                        {PHASE_LABELS[eng.phase] || `Phase ${eng.phase}`}
                        {eng.start_date && (
                          <span className="ml-2 text-charcoal/50">
                            Started {new Date(eng.start_date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[eng.status]?.bg || 'bg-gray-light'} ${STATUS_COLORS[eng.status]?.text || 'text-charcoal'}`}>
                        {eng.status}
                      </span>
                    </div>
                  </div>

                  {total > 0 && (
                    <div className="mt-4">
                      {/* Progress bar */}
                      <div className="flex rounded-full overflow-hidden h-2 bg-gray-light">
                        {delivered > 0 && (
                          <div className="bg-teal" style={{ width: `${(delivered / total) * 100}%` }} />
                        )}
                        {approved > 0 && (
                          <div className="bg-green" style={{ width: `${(approved / total) * 100}%` }} />
                        )}
                        {inReview > 0 && (
                          <div className="bg-gold" style={{ width: `${(inReview / total) * 100}%` }} />
                        )}
                        {draft > 0 && (
                          <div className="bg-charcoal/20" style={{ width: `${(draft / total) * 100}%` }} />
                        )}
                      </div>

                      {/* Counts */}
                      <div className="flex gap-4 mt-2 text-xs text-gray-warm">
                        {draft > 0 && <span>{draft} draft</span>}
                        {inReview > 0 && <span className="text-gold font-medium">{inReview} in review</span>}
                        {approved > 0 && <span className="text-green font-medium">{approved} approved</span>}
                        {delivered > 0 && <span className="text-teal font-medium">{delivered} delivered</span>}
                      </div>
                    </div>
                  )}

                  {total === 0 && (
                    <p className="mt-3 text-xs text-gray-warm italic">No outputs generated yet</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
