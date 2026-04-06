import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { apiGet, apiPut } from '../../../lib/api'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'
import SEO from '../../../components/SEO'
import MarkdownContent from '../../../components/MarkdownContent'

interface DriveOutput {
  phase_number: number
  output_name: string
  file_id: string
  filename: string
  modified_time: string | null
  size: string | null
  status: string
}

interface OutputRow {
  id: string
  engagement_id: string
  phase_number: number
  output_name: string
  output_type: string
  content_md: string | null
  status: string
  pdf_approved: boolean
  docx_pdf_preview_path: string | null
  pdf_preview_path: string | null
  docx_path: string | null
  pptx_path: string | null
  xlsx_path: string | null
  xlsx_link: string | null
  version: number
  updated_at: string
}

interface EngagementInfo {
  id: string
  phase: number
  clients: { company_name: string } | null
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

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-light', text: 'text-charcoal', label: 'Draft' },
  in_review: { bg: 'bg-gold/20', text: 'text-charcoal', label: 'In Review' },
  approved: { bg: 'bg-green/10', text: 'text-green', label: 'Approved' },
  delivered: { bg: 'bg-teal/10', text: 'text-teal', label: 'Delivered' },
}

export default function EngagementOutputs() {
  const { engagementId } = useParams<{ engagementId: string }>()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState<EngagementInfo | null>(null)
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [driveOutputs, setDriveOutputs] = useState<DriveOutput[]>([])
  const [driveContentCache, setDriveContentCache] = useState<Record<string, string>>({})
  const [loadingDriveContent, setLoadingDriveContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (engagementId) load()
  }, [engagementId])

  useRealtimeRefresh('engagement-outputs', () => { if (engagementId) load() },
    ['engagements', 'phase_output_content', 'phase_outputs'])

  async function load() {
    const [engRes, outRes] = await Promise.all([
      supabase
        .from('engagements')
        .select('id, phase, clients(company_name)')
        .eq('id', engagementId!)
        .single(),
      supabase
        .from('phase_output_content')
        .select('*')
        .eq('engagement_id', engagementId!)
        .order('phase_number', { ascending: true })
        .order('output_name', { ascending: true }),
    ])

    if (engRes.data) {
      const clients = Array.isArray(engRes.data.clients) ? engRes.data.clients[0] : engRes.data.clients
      setEngagement({ ...engRes.data, clients })
    }
    setOutputs(outRes.data || [])

    // Fetch Drive outputs
    try {
      const driveRes = await apiGet<{ outputs: DriveOutput[] }>(`/api/engagements/${engagementId}/drive-outputs`)
      setDriveOutputs(driveRes.outputs || [])
    } catch { /* ignore if endpoint not available */ }

    setLoading(false)
  }

  function getReviewRoute(output: OutputRow): string {
    const base = `/dashboard/deliverables/${engagementId}`
    if (output.output_type === 'xlsx') return `${base}/excel/${output.id}`
    if (output.status === 'draft' || output.status === 'in_review') {
      if (!output.content_md && (output.docx_pdf_preview_path || output.pdf_preview_path)) {
        return `${base}/pdf/${output.id}`
      }
      return `${base}/edit/${output.id}`
    }
    if (output.status === 'approved') {
      if (output.docx_pdf_preview_path || output.pdf_preview_path) {
        return `${base}/pdf/${output.id}`
      }
    }
    return `${base}/edit/${output.id}`
  }

  // Group outputs by phase
  const byPhase = new Map<number, OutputRow[]>()
  for (const o of outputs) {
    const list = byPhase.get(o.phase_number) || []
    list.push(o)
    byPhase.set(o.phase_number, list)
  }

  // Group Drive outputs by phase
  const driveByPhase = new Map<number, DriveOutput[]>()
  for (const d of driveOutputs) {
    const list = driveByPhase.get(d.phase_number) || []
    list.push(d)
    driveByPhase.set(d.phase_number, list)
  }

  // Merge phase numbers from both sources
  const allPhases = new Set([...byPhase.keys(), ...driveByPhase.keys()])

  const companyName = engagement?.clients?.company_name || 'Engagement'

  return (
    <>
      <SEO title={`${companyName} Outputs — BaxterLabs`} description="Engagement deliverable outputs" />

      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-warm mb-4">
          <Link to="/dashboard/deliverables" className="hover:text-teal transition-colors">Deliverables</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">{companyName}</span>
        </div>

        <h1 className="text-2xl font-bold text-charcoal mb-1">{companyName}</h1>
        <p className="text-sm text-gray-warm mb-6">
          Phase {engagement?.phase || '—'} — {outputs.length} output{outputs.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : outputs.length === 0 && driveOutputs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-light p-12 text-center">
            <p className="text-gray-warm">No outputs generated for this engagement yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(allPhases).sort((a, b) => a - b).map(phase => {
              const phaseOutputs = byPhase.get(phase) || []
              const drvOutputs = driveByPhase.get(phase) || []
              return (
              <div key={phase}>
                <h2 className="text-sm font-semibold text-charcoal/60 uppercase tracking-wider mb-3">
                  Phase {phase}
                </h2>
                <div className="space-y-2">
                  {/* Drive outputs */}
                  {drvOutputs.map(dOutput => (
                    <div
                      key={dOutput.file_id}
                      className="w-full bg-white rounded-lg border border-gray-light p-4 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-charcoal text-white flex items-center justify-center text-sm font-bold flex-shrink-0">M</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal truncate">{dOutput.output_name}</p>
                          <p className="text-xs text-gray-warm mt-0.5">
                            MD — Drive
                            {dOutput.modified_time && <span className="ml-2">Updated {new Date(dOutput.modified_time).toLocaleDateString()}</span>}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dOutput.status === 'approved' ? 'bg-green/10 text-green' : 'bg-gray-light text-charcoal'
                        }`}>
                          {dOutput.status === 'approved' ? 'Approved' : 'Draft'}
                        </span>
                        <button
                          onClick={async () => {
                            if (driveContentCache[dOutput.file_id]) {
                              setDriveContentCache(prev => { const next = { ...prev }; delete next[dOutput.file_id]; return next })
                              return
                            }
                            setLoadingDriveContent(dOutput.file_id)
                            try {
                              const res = await apiGet<{ content: string }>(`/api/engagements/${engagementId}/drive-outputs/${dOutput.file_id}/content`)
                              setDriveContentCache(prev => ({ ...prev, [dOutput.file_id]: res.content }))
                            } catch { /* ignore */ }
                            setLoadingDriveContent(null)
                          }}
                          className="text-xs text-teal font-semibold hover:underline flex-shrink-0"
                        >
                          {loadingDriveContent === dOutput.file_id ? '...' : driveContentCache[dOutput.file_id] ? 'Hide' : 'View'}
                        </button>
                        {dOutput.status !== 'approved' && (
                          <button
                            onClick={async () => {
                              try {
                                await apiPut(`/api/engagements/${engagementId}/drive-outputs/${dOutput.file_id}/approve`)
                                setDriveOutputs(prev => prev.map(d => d.file_id === dOutput.file_id ? { ...d, status: 'approved' } : d))
                              } catch { /* ignore */ }
                            }}
                            className="text-xs bg-green text-white px-3 py-1 rounded font-semibold hover:bg-green/90"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                      {driveContentCache[dOutput.file_id] && (
                        <div className="mt-3 bg-ivory rounded-lg p-4 prose-bl text-sm max-h-[400px] overflow-auto">
                          <MarkdownContent content={driveContentCache[dOutput.file_id]} />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* DB-sourced outputs — hidden when Drive outputs exist for this phase */}
                  {drvOutputs.length === 0 && phaseOutputs.map(output => {
                    const badge = STATUS_BADGE[output.status] || STATUS_BADGE.draft
                    return (
                      <button
                        key={output.id}
                        onClick={() => navigate(getReviewRoute(output))}
                        className="w-full bg-white rounded-lg border border-gray-light hover:border-teal/30 hover:shadow-sm transition-all p-4 text-left flex items-center gap-4"
                      >
                        {/* Type icon */}
                        <div className={`w-10 h-10 rounded-lg ${TYPE_COLORS[output.output_type] || 'bg-charcoal'} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                          {TYPE_ICONS[output.output_type] || '?'}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal truncate">{output.output_name}</p>
                          <p className="text-xs text-gray-warm mt-0.5">
                            {output.output_type.toUpperCase()} — v{output.version}
                            <span className="ml-2">
                              Updated {new Date(output.updated_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>

                        {/* Stage indicators */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {output.pdf_approved && (
                            <span className="text-xs text-green font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Format OK
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Arrow */}
                        <svg className="w-5 h-5 text-charcoal/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    )
                  })}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
