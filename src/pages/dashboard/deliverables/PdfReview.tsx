import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { apiFetchBlob } from '../../../lib/api'
import SEO from '../../../components/SEO'

interface OutputRow {
  id: string
  engagement_id: string
  phase_number: number
  output_name: string
  output_type: string
  status: string
  pdf_approved: boolean
  docx_pdf_preview_path: string | null
  pdf_preview_path: string | null
  version: number
  updated_at: string
}

export default function PdfReview() {
  const { engagementId, outputId } = useParams<{ engagementId: string; outputId: string }>()
  const [output, setOutput] = useState<OutputRow | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [fixNote, setFixNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [fixSubmitted, setFixSubmitted] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (outputId) load()
  }, [outputId])

  async function load() {
    const [outRes, engRes] = await Promise.all([
      supabase
        .from('phase_output_content')
        .select('*')
        .eq('id', outputId!)
        .single(),
      supabase
        .from('engagements')
        .select('clients(company_name)')
        .eq('id', engagementId!)
        .single(),
    ])

    if (outRes.data) {
      setOutput(outRes.data)
      // Resolve PDF URL — use docx_pdf_preview_path for Word track, pdf_preview_path for Deck track
      const path = outRes.data.docx_pdf_preview_path || outRes.data.pdf_preview_path
      if (path) {
        if (path.startsWith('http')) {
          // Full URL — fetch via auth proxy to create blob URL
          try {
            const blob = await apiFetchBlob(path)
            setPdfUrl(URL.createObjectURL(blob))
          } catch {
            setPdfUrl(null)
          }
        } else if (path.includes('/') || path.includes('.')) {
          // Supabase storage path
          const { data } = supabase.storage.from('engagements').getPublicUrl(path)
          setPdfUrl(data?.publicUrl || null)
        } else {
          // Bare Drive file ID — build backend proxy URL and fetch via auth
          const outNum = outRes.data.output_number || 1
          const phaseNum = outRes.data.phase_number || 5
          const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
          const proxyUrl = `${apiUrl}/api/engagements/${outRes.data.engagement_id}/outputs/${outNum}/preview-pdf?phase_number=${phaseNum}`
          try {
            const blob = await apiFetchBlob(proxyUrl)
            setPdfUrl(URL.createObjectURL(blob))
          } catch {
            setPdfUrl(null)
          }
        }
      }
    }
    if (engRes.data) {
      const clients = Array.isArray(engRes.data.clients) ? engRes.data.clients[0] : engRes.data.clients
      setCompanyName(clients?.company_name || 'Engagement')
    }
    setLoading(false)
  }

  async function handleSubmitFix() {
    if (!fixNote.trim() || !output) return
    setSubmitting(true)

    // Log the formatting fix request to activity_log
    await supabase.from('activity_log').insert({
      engagement_id: output.engagement_id,
      actor: 'partner',
      action: 'formatting_fix_requested',
      details: {
        output_id: output.id,
        output_name: output.output_name,
        output_type: output.output_type,
        fix_instruction: fixNote.trim(),
      },
    })

    setFixSubmitted(true)
    setFixNote('')
    setSubmitting(false)
  }

  async function handleApproveFormat() {
    if (!output) return
    setApproving(true)
    await supabase
      .from('phase_output_content')
      .update({ pdf_approved: true })
      .eq('id', output.id)
    setOutput(prev => prev ? { ...prev, pdf_approved: true } : prev)
    setApproving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!output) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-warm">Output not found</p>
      </div>
    )
  }

  const trackLabel = output.output_type === 'pptx' ? 'Slide Deck' : 'Document'
  const isApproved = output.pdf_approved

  return (
    <>
      <SEO title={`${output.output_name} — Format Review`} description="Review document formatting" />

      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-warm mb-4">
          <Link to="/dashboard/deliverables" className="hover:text-teal transition-colors">Deliverables</Link>
          <span>/</span>
          <Link to={`/dashboard/deliverables/${engagementId}`} className="hover:text-teal transition-colors">{companyName}</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">{output.output_name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-charcoal">{output.output_name}</h1>
            <p className="text-sm text-gray-warm mt-0.5">
              {trackLabel} Preview — Phase {output.phase_number} — v{output.version}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isApproved ? (
              <button
                onClick={handleApproveFormat}
                disabled={approving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-green text-white hover:bg-green/90 disabled:opacity-60 transition-colors"
              >
                {approving ? 'Approving...' : 'Approve Format'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green/10 text-green text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Format Approved
              </span>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-xl border border-gray-light overflow-hidden mb-4">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full border-0"
              style={{ height: '70vh' }}
              title={`${output.output_name} preview`}
            />
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-warm">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-charcoal/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p>PDF preview not yet available</p>
                <p className="text-xs mt-1">The formatted document hasn't been generated yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Formatting fix panel */}
        {!isApproved && (
          <div className="bg-white rounded-xl border border-gray-light p-5">
            <h3 className="text-sm font-semibold text-charcoal mb-2">Request Formatting Fix</h3>
            <p className="text-xs text-gray-warm mb-3">
              Describe what needs to change (e.g., "title running on to two lines, fix line 45")
            </p>

            {fixSubmitted && (
              <div className="mb-3 px-3 py-2 bg-green/10 border border-green/20 rounded-lg text-xs text-green">
                Fix request submitted. The document will be regenerated.
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={fixNote}
                onChange={e => setFixNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmitFix()}
                placeholder="Describe the formatting fix needed..."
                className="flex-1 px-3 py-2 text-sm border border-gray-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
              <button
                onClick={handleSubmitFix}
                disabled={!fixNote.trim() || submitting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gold text-white hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Sending...' : 'Submit Fix'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
