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
  xlsx_link: string | null
  xlsx_path: string | null
  version: number
  updated_at: string
  created_at: string
}

export default function ExcelReview() {
  const { engagementId, outputId } = useParams<{ engagementId: string; outputId: string }>()
  const [output, setOutput] = useState<OutputRow | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(true)

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

    if (outRes.data) setOutput(outRes.data)
    if (engRes.data) {
      const clients = Array.isArray(engRes.data.clients) ? engRes.data.clients[0] : engRes.data.clients
      setCompanyName(clients?.company_name || 'Engagement')
    }
    setLoading(false)
  }

  async function handleApprove() {
    if (!output) return
    await supabase
      .from('phase_output_content')
      .update({ status: 'approved' })
      .eq('id', output.id)
    setOutput(prev => prev ? { ...prev, status: 'approved' } : prev)
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

  const isApproved = output.status === 'approved' || output.status === 'delivered'

  return (
    <>
      <SEO title={`${output.output_name} — Excel Review`} description="Review Excel workbook" />

      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-warm mb-4">
          <Link to="/dashboard/deliverables" className="hover:text-teal transition-colors">Deliverables</Link>
          <span>/</span>
          <Link to={`/dashboard/deliverables/${engagementId}`} className="hover:text-teal transition-colors">{companyName}</Link>
          <span>/</span>
          <span className="text-charcoal font-medium">{output.output_name}</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-light p-8 text-center">
          {/* Excel icon */}
          <div className="w-20 h-20 rounded-2xl bg-green/10 mx-auto mb-5 flex items-center justify-center">
            <svg className="w-10 h-10 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 10.875c0-.621.504-1.125 1.125-1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m-1.125 2.25c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h1.5" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-charcoal mb-1">{output.output_name}</h1>
          <p className="text-sm text-gray-warm mb-6">
            Excel Workbook — Phase {output.phase_number} — v{output.version}
          </p>

          {/* Metadata */}
          <div className="inline-flex flex-col items-start gap-2 text-left text-sm text-gray-warm mb-8 bg-ivory rounded-lg px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-charcoal w-24">Client:</span>
              <span>{companyName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-charcoal w-24">Generated:</span>
              <span>{new Date(output.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-charcoal w-24">Updated:</span>
              <span>{new Date(output.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-charcoal w-24">Status:</span>
              <span className={isApproved ? 'text-green font-medium' : ''}>{output.status}</span>
            </div>
          </div>

          {/* Open in Excel button */}
          {output.xlsx_link ? (
            <div className="space-y-3">
              <a
                href={output.xlsx_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-lg bg-green text-white hover:bg-green/90 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Excel
              </a>
              <p className="text-xs text-gray-warm">Opens in a new tab via Google Drive</p>
            </div>
          ) : (
            <div className="px-4 py-3 bg-ivory rounded-lg text-sm text-gray-warm">
              Excel file not yet available. It will appear here once generated.
            </div>
          )}

          {/* Approve */}
          {!isApproved && (
            <div className="mt-8 pt-6 border-t border-gray-light">
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 text-sm font-medium rounded-lg bg-green text-white hover:bg-green/90 transition-colors"
              >
                Approve Excel
              </button>
            </div>
          )}

          {isApproved && (
            <div className="mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green/10 text-green text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Approved
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
