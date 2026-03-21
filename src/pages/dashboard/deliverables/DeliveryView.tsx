import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import SEO from '../../../components/SEO'

interface OutputRow {
  id: string
  engagement_id: string
  phase_number: number
  output_name: string
  output_type: string
  status: string
  pdf_approved: boolean
  docx_path: string | null
  pptx_path: string | null
  xlsx_path: string | null
  xlsx_link: string | null
  version: number
  updated_at: string
}

interface ActivityRow {
  id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  docx: 'W',
  pptx: 'P',
  xlsx: 'X',
  md: 'M',
}

const TYPE_COLORS: Record<string, string> = {
  docx: 'bg-blue-600',
  pptx: 'bg-orange-500',
  xlsx: 'bg-green',
  md: 'bg-charcoal',
}

export default function DeliveryView() {
  const { engagementId } = useParams<{ engagementId: string }>()
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (engagementId) load()
  }, [engagementId])

  async function load() {
    const [outRes, engRes, actRes] = await Promise.all([
      supabase
        .from('phase_output_content')
        .select('*')
        .eq('engagement_id', engagementId!)
        .in('status', ['approved', 'delivered'])
        .order('phase_number', { ascending: true }),
      supabase
        .from('engagements')
        .select('clients(company_name)')
        .eq('id', engagementId!)
        .single(),
      supabase
        .from('activity_log')
        .select('id, action, details, created_at')
        .eq('engagement_id', engagementId!)
        .in('action', ['deliverables_sent', 'deliverable_released', 'formatting_fix_requested'])
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setOutputs(outRes.data || [])
    setActivities(actRes.data || [])
    if (engRes.data) {
      const clients = Array.isArray(engRes.data.clients) ? engRes.data.clients[0] : engRes.data.clients
      setCompanyName(clients?.company_name || 'Engagement')
    }
    setLoading(false)
  }

  async function markDelivered(outputId: string) {
    await supabase
      .from('phase_output_content')
      .update({ status: 'delivered' })
      .eq('id', outputId)
    setOutputs(prev => prev.map(o => o.id === outputId ? { ...o, status: 'delivered' } : o))
  }

  function getFileLink(output: OutputRow): string | null {
    if (output.output_type === 'xlsx') return output.xlsx_link || output.xlsx_path
    if (output.output_type === 'pptx') return output.pptx_path
    if (output.output_type === 'docx') return output.docx_path
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const readyToSend = outputs.filter(o => o.status === 'approved')
  const alreadySent = outputs.filter(o => o.status === 'delivered')

  return (
    <>
      <SEO title={`${companyName} — Delivery`} />

      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-warm mb-4">
          <Link to="/dashboard/deliverables" className="hover:text-teal transition-colors">Deliverables</Link>
          <span>/</span>
          <Link to={`/dashboard/deliverables/${engagementId}`} className="hover:text-teal transition-colors">{companyName}</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">Delivery</span>
        </div>

        <h1 className="text-2xl font-bold text-charcoal mb-1">Delivery</h1>
        <p className="text-sm text-gray-warm mb-6">{companyName} — approved deliverables ready for client</p>

        {/* Ready to send */}
        {readyToSend.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold" />
              Ready to Send ({readyToSend.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-light divide-y divide-gray-light">
              {readyToSend.map(output => {
                const fileLink = getFileLink(output)
                return (
                  <div key={output.id} className="flex items-center gap-4 p-4">
                    <div className={`w-9 h-9 rounded-lg ${TYPE_COLORS[output.output_type] || 'bg-charcoal'} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                      {TYPE_ICONS[output.output_type] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal">{output.output_name}</p>
                      <p className="text-xs text-gray-warm">
                        {output.output_type.toUpperCase()} — Phase {output.phase_number} — v{output.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fileLink && (
                        <a
                          href={fileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-light text-charcoal hover:bg-ivory transition-colors"
                        >
                          Open file
                        </a>
                      )}
                      <button
                        onClick={() => markDelivered(output.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Already delivered */}
        {alreadySent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green" />
              Delivered ({alreadySent.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-light divide-y divide-gray-light">
              {alreadySent.map(output => (
                <div key={output.id} className="flex items-center gap-4 p-4 opacity-70">
                  <div className={`w-9 h-9 rounded-lg ${TYPE_COLORS[output.output_type] || 'bg-charcoal'} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {TYPE_ICONS[output.output_type] || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">{output.output_name}</p>
                    <p className="text-xs text-gray-warm">
                      {output.output_type.toUpperCase()} — Phase {output.phase_number}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-green font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Delivered
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {outputs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-light p-12 text-center">
            <p className="text-gray-warm">No approved deliverables yet</p>
            <Link to={`/dashboard/deliverables/${engagementId}`} className="text-teal text-sm mt-2 inline-block hover:underline">
              View all outputs
            </Link>
          </div>
        )}

        {/* Recent activity */}
        {activities.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-3">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-gray-light divide-y divide-gray-light">
              {activities.map(act => (
                <div key={act.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-charcoal">
                      {act.action.replace(/_/g, ' ')}
                      {act.details?.output_name && (
                        <span className="text-gray-warm"> — {String(act.details.output_name)}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-warm flex-shrink-0">
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
