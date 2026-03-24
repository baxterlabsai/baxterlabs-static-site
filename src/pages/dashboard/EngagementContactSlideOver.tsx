import { useEffect, useState, useRef } from 'react'
import { apiGet, apiPost, apiPatch, apiUpload } from '../../lib/api'
import MarkdownContent from '../../components/MarkdownContent'
import TranscriptUpload from '../../components/TranscriptUpload'

/** Convert plain-text prep notes to markdown so headings/questions render properly. */
function formatPrepNotes(raw: string): string {
  // If content already has markdown headings, it's pre-formatted — pass through
  if (/^#{1,4}\s/m.test(raw)) return raw
  return raw.split('\n').map(line => {
    const trimmed = line.trim()
    if (!trimmed) return ''
    // Section/title headers → ## heading
    if (/^(INTERVIEW PREP|SECTION \d|COVERAGE SUMMARY|CLOSING)/i.test(trimmed)) {
      return `## ${trimmed}`
    }
    // Fully uppercase lines (4+ chars, no lowercase letters) → ## heading
    if (trimmed.length >= 4 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      return `## ${trimmed}`
    }
    // Metadata lines → italic
    if (/^(Prepared:|Question prefix:|Engagement )/.test(trimmed)) {
      return `*${trimmed}*`
    }
    // Company + engagement ID line → italic
    if (/\| Engagement [0-9a-f-]+/.test(trimmed)) {
      return `*${trimmed}*`
    }
    // Question lines: Q1. Q2. etc → bold
    if (/^Q\d+[.)]\s/.test(trimmed)) {
      return `**${trimmed}**`
    }
    // Arrow lines → italic
    if (trimmed.startsWith('→')) {
      return `*${trimmed}*`
    }
    // Gap closure tags [Schild-Q1] [Closes Gap 1] → bold
    if (/^\[.+\]\s*\[.+\]/.test(trimmed)) {
      return `**${trimmed}**`
    }
    return trimmed
  }).join('\n\n')
}

interface ContactDetail {
  id: string
  engagement_id: string
  contact_number: number | null
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
  transcript_gdrive_url: string | null
  prep_source_phase_output_id: string | null
  prep_notes: string | null
  created_at: string
  updated_at: string
}

interface ContactResearchDoc {
  id: string
  type: string
  contact_name: string
  title: string | null
  content: string | null
  source: string | null
  created_at: string
}

interface TranscriptAnalysis {
  summary: string
  key_findings: string[]
  financial_indicators: string[]
  process_gaps: string[]
  notable_quotes: Array<{ quote: string; context: string }>
}

interface TranscriptIntelContact {
  contact_id: string
  contact_name: string
  contact_title: string | null
  document_id: string
  has_extracted_text: boolean
  analysis: TranscriptAnalysis | null
  citation: string
  analyzed: boolean
}

interface Props {
  contactId: string
  engagementId: string
  companyName: string
  onClose: () => void
}

export default function EngagementContactSlideOver({ contactId, engagementId, companyName, onClose }: Props) {
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [transcriptUploading, setTranscriptUploading] = useState(false)
  const [transcriptIntel, setTranscriptIntel] = useState<TranscriptIntelContact | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false)

  // Research & Intelligence tabbed panel
  const [intelOpen, setIntelOpen] = useState(false)
  const [intelTab, setIntelTab] = useState<'research' | 'prep'>('research')
  const [contactResearch, setContactResearch] = useState<ContactResearchDoc | null>(null)

  const prepNotes = contact?.prep_notes ? formatPrepNotes(contact.prep_notes) : null

  const fetchIntel = () => {
    apiGet<{ contacts: TranscriptIntelContact[] }>(`/api/engagements/${engagementId}/transcript-intelligence`)
      .then(res => {
        const match = res.contacts.find(c => c.contact_id === contactId)
        setTranscriptIntel(match || null)
        if (match?.analyzed) setAnalyzing(false)
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    apiGet<ContactDetail>(`/api/engagements/${engagementId}/contacts/${contactId}`)
      .then(data => {
        setContact(data)
        // Fetch contact research
        apiGet<{ document: ContactResearchDoc | null }>(
          `/api/engagements/${engagementId}/contact-research?contact_name=${encodeURIComponent(data.name)}`
        )
          .then(res => setContactResearch(res.document))
          .catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    fetchIntel()
  }, [contactId, engagementId])

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setToast(`Copied: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`)
    setTimeout(() => setToast(''), 2000)
  }

  const fullscreenRef = useRef<HTMLDivElement>(null)

  // Close fullscreen on Escape
  useEffect(() => {
    if (!fullscreenModalOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreenModalOpen(false) }
    document.addEventListener('keydown', handleKey)
    fullscreenRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [fullscreenModalOpen])

  return (
    <>
      {/* Fullscreen Research & Intelligence overlay with tabs */}
      {fullscreenModalOpen && (
        <div
          ref={fullscreenRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 z-60 bg-white flex flex-col outline-none"
        >
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-light flex-shrink-0">
            <h2 className="text-lg font-display font-bold text-charcoal">
              Research & Intelligence — {contact?.name || ''}
            </h2>
            <button
              onClick={() => setFullscreenModalOpen(false)}
              className="text-gray-warm hover:text-charcoal p-1 rounded-lg hover:bg-ivory transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex border-b border-gray-light px-8 pt-2 flex-shrink-0">
            <button
              onClick={() => setIntelTab('research')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                intelTab === 'research' ? 'border-teal text-teal' : 'border-transparent text-gray-warm hover:text-charcoal'
              }`}
            >
              {contactResearch && <span className="w-1.5 h-1.5 rounded-full bg-teal" />}
              Research
            </button>
            <button
              onClick={() => setIntelTab('prep')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                intelTab === 'prep' ? 'border-teal text-teal' : 'border-transparent text-gray-warm hover:text-charcoal'
              }`}
            >
              {prepNotes && <span className="w-1.5 h-1.5 rounded-full bg-teal" />}
              Interview Prep
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            {intelTab === 'research' && (
              contactResearch?.content ? (
                <div className="prose-bl max-w-none"><MarkdownContent content={contactResearch.content} /></div>
              ) : (
                <p className="text-sm text-gray-warm italic py-4">Run Contact Research to populate this section</p>
              )
            )}
            {intelTab === 'prep' && (
              prepNotes ? (
                <div className="prose-bl max-w-none"><MarkdownContent content={prepNotes} /></div>
              ) : (
                <p className="text-sm text-gray-warm italic py-4">Run Interview Prep to populate this section</p>
              )
            )}
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-1/2 min-w-[600px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-light">
          <div className="min-w-0">
            <h2 className="text-lg font-display font-bold text-charcoal truncate">
              {contact?.name || 'Loading...'}
            </h2>
            {contact?.title && (
              <p className="text-sm text-gray-warm">{contact.title}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-warm hover:text-charcoal ml-3 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contact ? (
            <>
              {/* Contact Info */}
              <div className="space-y-1.5">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-warm flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <a href={`mailto:${contact.email}`} className="text-teal hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-charcoal">
                    <svg className="w-4 h-4 text-gray-warm flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {contact.phone}
                  </div>
                )}
                {contact.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-gray-warm flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.56a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
                    </svg>
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">LinkedIn</a>
                  </div>
                )}
                {contact.context_notes && (
                  <p className="text-xs text-charcoal italic mt-2">{contact.context_notes}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal mb-2">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyToClipboard(`/contact-research ${contact.name} at ${companyName}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-medium text-charcoal bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    Research
                  </button>
                  <button
                    onClick={() => copyToClipboard(`/interview-prep ${engagementId} ${contact.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-medium text-charcoal bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    Interview Prep
                  </button>
                  {contact.transcript_gdrive_url && (
                    <button
                      onClick={() => copyToClipboard(`/process-transcript ${engagementId} ${contact.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-medium text-charcoal bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      Process Transcript
                    </button>
                  )}
                  {contact.email && (
                    <a
                      href={`https://calendly.com/george-baxterlabs/leadership-interview?name=${encodeURIComponent(contact.name)}&email=${encodeURIComponent(contact.email)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-xs font-medium text-charcoal bg-teal/5 hover:bg-teal/10 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      Schedule Interview
                    </a>
                  )}
                </div>
                {toast && <p className="text-xs text-teal font-medium animate-pulse mt-2">{toast}</p>}
              </div>

              {/* Research & Intelligence — Collapsible Tabbed Panel */}
              <div className="border border-teal/20 rounded-lg overflow-hidden">
                <button
                  onClick={() => setIntelOpen(prev => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-teal/5 hover:bg-teal/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <span className="text-sm font-semibold text-teal">Research & Intelligence</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {((intelTab === 'research' && contactResearch?.content) || (intelTab === 'prep' && prepNotes)) && (
                      <button
                        onClick={e => { e.stopPropagation(); setFullscreenModalOpen(true) }}
                        className="p-1 text-teal/60 hover:text-teal hover:bg-teal/10 rounded transition-colors flex-shrink-0"
                        title="Open fullscreen"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>
                      </button>
                    )}
                    <svg className={`w-4 h-4 text-teal/60 transition-transform ${intelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {intelOpen && (
                  <>
                    {/* Tab bar */}
                    <div className="flex border-b border-gray-light px-4 pt-1 bg-white border-t border-teal/10">
                      <button
                        onClick={() => setIntelTab('research')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                          intelTab === 'research'
                            ? 'border-teal text-teal'
                            : 'border-transparent text-gray-warm hover:text-charcoal'
                        }`}
                      >
                        {contactResearch && <span className="w-1.5 h-1.5 rounded-full bg-teal" />}
                        Research
                      </button>
                      <button
                        onClick={() => setIntelTab('prep')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                          intelTab === 'prep'
                            ? 'border-teal text-teal'
                            : 'border-transparent text-gray-warm hover:text-charcoal'
                        }`}
                      >
                        {prepNotes && <span className="w-1.5 h-1.5 rounded-full bg-teal" />}
                        Interview Prep
                      </button>
                    </div>

                    {/* Tab content */}
                    <div className="px-4 py-3 bg-white">
                      {intelTab === 'research' && (
                        contactResearch?.content ? (
                          <div className="bg-ivory/50 border border-gray-light rounded p-3 max-h-[500px] overflow-y-auto">
                            <MarkdownContent content={contactResearch.content} />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-warm italic py-4">Run Contact Research to populate this section</p>
                        )
                      )}
                      {intelTab === 'prep' && (
                        prepNotes ? (
                          <div className="bg-ivory/50 border border-gray-light rounded p-3 max-h-[500px] overflow-y-auto">
                            <MarkdownContent content={prepNotes} />
                          </div>
                        ) : (
                          <p className="text-sm text-gray-warm italic py-4">Run Interview Prep to populate this section</p>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Interview Transcript */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal mb-2">Interview Transcript</h4>
                <TranscriptUpload
                  existing={contact.transcript_document_id ? {
                    filename: 'Interview Transcript',
                    uploaded_at: contact.updated_at,
                  } : null}
                  uploading={transcriptUploading}
                  onUpload={async (file) => {
                    setTranscriptUploading(true)
                    try {
                      const formData = new FormData()
                      formData.append('file', file)
                      const updated = await apiUpload<ContactDetail>(
                        `/api/engagements/${engagementId}/contacts/${contactId}/transcript`,
                        formData
                      )
                      setContact(updated)
                      setAnalyzing(true)
                      const poll = setInterval(() => {
                        apiGet<{ contacts: TranscriptIntelContact[] }>(`/api/engagements/${engagementId}/transcript-intelligence`)
                          .then(res => {
                            const match = res.contacts.find(c => c.contact_id === contactId)
                            if (match?.analyzed) {
                              setTranscriptIntel(match)
                              setAnalyzing(false)
                              setAnalysisOpen(true)
                              clearInterval(poll)
                            }
                          })
                          .catch(() => {})
                      }, 4000)
                      setTimeout(() => { clearInterval(poll); setAnalyzing(false) }, 120000)
                    } finally {
                      setTranscriptUploading(false)
                    }
                  }}
                  onGDocImport={async (gdocUrl) => {
                    setTranscriptUploading(true)
                    try {
                      const updated = await apiPost<ContactDetail>(
                        `/api/engagements/${engagementId}/contacts/${contactId}/transcript-gdoc`,
                        { gdoc_url: gdocUrl }
                      )
                      await apiPatch(`/api/engagements/${engagementId}/contacts/${contactId}`, {
                        transcript_gdrive_url: gdocUrl,
                      })
                      setContact({ ...updated, transcript_gdrive_url: gdocUrl })
                      setAnalyzing(true)
                      const poll = setInterval(() => {
                        apiGet<{ contacts: TranscriptIntelContact[] }>(`/api/engagements/${engagementId}/transcript-intelligence`)
                          .then(res => {
                            const match = res.contacts.find(c => c.contact_id === contactId)
                            if (match?.analyzed) {
                              setTranscriptIntel(match)
                              setAnalyzing(false)
                              setAnalysisOpen(true)
                              clearInterval(poll)
                            }
                          })
                          .catch(() => {})
                      }, 4000)
                      setTimeout(() => { clearInterval(poll); setAnalyzing(false) }, 120000)
                    } finally {
                      setTranscriptUploading(false)
                    }
                  }}
                  onDownload={async () => {
                    const res = await apiGet<{ url: string }>(
                      `/api/engagements/${engagementId}/contacts/${contactId}/transcript/download`
                    )
                    window.open(res.url, '_blank')
                  }}
                />
              </div>

              {/* Transcript Analysis */}
              {(analyzing || transcriptIntel?.analyzed) && (
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setAnalysisOpen(!analysisOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-800">Transcript Analysis</span>
                      {analyzing && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-2 h-2 border border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </span>
                      )}
                      {transcriptIntel?.analyzed && !analyzing && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Complete</span>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-emerald-600 transition-transform ${analysisOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {analysisOpen && transcriptIntel?.analysis && (
                    <div className="px-4 py-3 bg-white space-y-3">
                      <p className="text-[11px] text-gray-warm font-mono">{transcriptIntel.citation}</p>
                      <div>
                        <p className="text-xs font-semibold text-charcoal mb-1">Summary</p>
                        <div className="text-xs text-charcoal leading-relaxed"><MarkdownContent content={transcriptIntel.analysis.summary} /></div>
                      </div>
                      {transcriptIntel.analysis.key_findings?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-charcoal mb-1">Key Findings</p>
                          <ul className="space-y-1">
                            {transcriptIntel.analysis.key_findings.map((f, i) => (
                              <li key={i} className="text-xs text-charcoal flex gap-1.5">
                                <span className="text-emerald-600 mt-0.5 flex-shrink-0">&#8226;</span>
                                <MarkdownContent content={f} className="inline-prose" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {transcriptIntel.analysis.financial_indicators?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-charcoal mb-1">Financial Indicators</p>
                          <ul className="space-y-1">
                            {transcriptIntel.analysis.financial_indicators.map((fi, i) => (
                              <li key={i} className="text-xs text-charcoal flex gap-1.5">
                                <span className="text-gold mt-0.5 flex-shrink-0">$</span>
                                <MarkdownContent content={fi} className="inline-prose" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {transcriptIntel.analysis.notable_quotes?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-charcoal mb-1">Notable Quotes</p>
                          <div className="space-y-2">
                            {transcriptIntel.analysis.notable_quotes.map((q, i) => (
                              <div key={i} className="pl-3 border-l-2 border-emerald-300">
                                <p className="text-xs text-charcoal italic">&ldquo;{q.quote}&rdquo;</p>
                                {q.context && <div className="text-[11px] text-gray-warm mt-0.5"><MarkdownContent content={q.context} className="inline-prose" /></div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </>
          ) : (
            <p className="text-sm text-gray-warm text-center py-8">Contact not found.</p>
          )}
        </div>
      </div>
    </>
  )
}
