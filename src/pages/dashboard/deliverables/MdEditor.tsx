import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import SEO from '../../../components/SEO'

interface OutputRow {
  id: string
  engagement_id: string
  phase_number: number
  output_name: string
  output_type: string
  content_md: string | null
  status: string
  version: number
  updated_at: string
}

export default function MdEditor() {
  const { engagementId, outputId } = useParams<{ engagementId: string; outputId: string }>()
  const [output, setOutput] = useState<OutputRow | null>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [previewMode, setPreviewMode] = useState(false)

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
      setContent(outRes.data.content_md || '')
      setOriginalContent(outRes.data.content_md || '')
    }
    if (engRes.data) {
      const clients = Array.isArray(engRes.data.clients) ? engRes.data.clients[0] : engRes.data.clients
      setCompanyName(clients?.company_name || 'Engagement')
    }
    setLoading(false)
  }

  const isDirty = content !== originalContent
  const isLocked = output?.status === 'approved' || output?.status === 'delivered'

  const handleSave = useCallback(async () => {
    if (!output || !isDirty || isLocked) return
    setSaving(true)
    await supabase
      .from('phase_output_content')
      .update({ content_md: content, status: 'in_review' })
      .eq('id', output.id)
    setOriginalContent(content)
    setOutput(prev => prev ? { ...prev, content_md: content, status: 'in_review' } : prev)
    setSaving(false)
  }, [output, content, isDirty, isLocked])

  async function handleApprove() {
    if (!output) return
    if (isDirty) await handleSave()
    setApproving(true)
    await supabase
      .from('phase_output_content')
      .update({ status: 'approved' })
      .eq('id', output.id)
    setOutput(prev => prev ? { ...prev, status: 'approved' } : prev)
    setApproving(false)
  }

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleSave])

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
        <Link to="/dashboard/deliverables" className="text-teal text-sm mt-2 inline-block hover:underline">Back to deliverables</Link>
      </div>
    )
  }

  return (
    <>
      <SEO title={`${output.output_name} — Edit`} description="Edit deliverable content" />

      <div className="max-w-5xl mx-auto">
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
              {output.output_type.toUpperCase()} — Phase {output.phase_number} — v{output.version}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Edit/Preview toggle */}
            <div className="flex rounded-lg border border-gray-light overflow-hidden">
              <button
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${!previewMode ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-ivory'}`}
              >
                Edit
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${previewMode ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-ivory'}`}
              >
                Preview
              </button>
            </div>

            {!isLocked && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-light text-charcoal hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green text-white hover:bg-green/90 disabled:opacity-60 transition-colors"
                >
                  {approving ? 'Approving...' : 'Approve Content'}
                </button>
              </>
            )}

            {isLocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green/10 text-green text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Content Approved
              </span>
            )}
          </div>
        </div>

        {/* Dirty indicator */}
        {isDirty && !isLocked && (
          <div className="mb-3 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg text-xs text-charcoal flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            Unsaved changes — press Cmd+S to save
          </div>
        )}

        {/* Editor / Preview */}
        <div className="bg-white rounded-xl border border-gray-light overflow-hidden" style={{ minHeight: '60vh' }}>
          {previewMode ? (
            <div className="p-8 prose-bl">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              ) : (
                <p className="text-gray-warm italic">No content</p>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={isLocked}
              className="w-full h-full min-h-[60vh] p-6 font-mono text-sm text-charcoal bg-white resize-none focus:outline-none disabled:bg-ivory disabled:cursor-not-allowed"
              placeholder="Markdown content..."
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </>
  )
}

/** Simple markdown to HTML (headings, bold, italic, lists, paragraphs) */
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hulo])(.+)$/gm, '<p>$1</p>')
}
