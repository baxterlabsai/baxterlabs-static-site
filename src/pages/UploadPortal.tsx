import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ChecklistItem {
  key: string
  category: string
  name: string
  notes: string
  priority: 'required' | 'if_available' | 'optional'
  uploaded: boolean
  filename?: string
  file_size?: number
  uploaded_at?: string
}

interface Progress {
  total_items: number
  total_uploaded: number
  required_total: number
  required_uploaded: number
}

interface UploadStatus {
  engagement_id: string
  company_name: string
  partner_lead: string
  is_complete: boolean
  expired?: boolean
  contact_email?: string
  checklist: ChecklistItem[]
  progress: Progress
}

const CATEGORY_LABELS: Record<string, string> = {
  financial: 'A. Financial Statements',
  payroll: 'B. Payroll & Compensation',
  vendor: 'C. Vendor & Expense',
  revenue: 'D. Revenue & Collections',
  operations: 'E. Operations',
  legal: 'F. Legal & Tax',
}

const CATEGORY_ORDER = ['financial', 'payroll', 'vendor', 'revenue', 'operations', 'legal']
const DEFAULT_EXPANDED = new Set(['financial', 'payroll', 'vendor', 'revenue'])

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.png', '.jpg', '.jpeg'])
const MAX_FILE_SIZE = 50 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function priorityBadge(p: string) {
  if (p === 'required') return <span className="text-[10px] font-bold uppercase tracking-wider text-crimson bg-crimson/10 px-1.5 py-0.5 rounded">Required</span>
  if (p === 'if_available') return <span className="text-[10px] font-bold uppercase tracking-wider text-amber bg-amber/10 px-1.5 py-0.5 rounded">If Available</span>
  return <span className="text-[10px] font-bold uppercase tracking-wider text-gray-warm bg-gray-light px-1.5 py-0.5 rounded">Optional</span>
}

export default function UploadPortal() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<UploadStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(DEFAULT_EXPANDED))
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [missingItems, setMissingItems] = useState<Array<{ key: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const fetchStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/upload/${token}/status`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Invalid upload link')
      }
      const data: UploadStatus & { expired?: boolean; contact_email?: string } = await res.json()
      if (data.expired) {
        setExpired(true)
        setContactEmail(data.contact_email || 'george@baxterlabs.ai')
        return
      }
      setStatus(data)
      if (data.is_complete) setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load upload portal')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return `File type "${ext}" not allowed. Accepted: ${[...ALLOWED_EXTENSIONS].join(', ')}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File exceeds 50MB limit.'
    }
    return null
  }

  const uploadFile = async (file: File, itemKey: string) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploadingKey(itemKey)
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('item_key', itemKey)

    try {
      const res = await fetch(`${API_URL}/api/upload/${token}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Upload failed')
      }

      // Refresh status to get updated checklist
      await fetchStatus()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingKey(null)
    }
  }

  const handleDrop = (e: React.DragEvent, itemKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file, itemKey)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, itemKey: string) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file, itemKey)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!token) return
    setSubmitting(true)

    try {
      const res = await fetch(`${API_URL}/api/upload/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })

      const data = await res.json()

      if (data.warning && data.missing_items) {
        setMissingItems(data.missing_items)
        setShowSubmitModal(true)
        setSubmitting(false)
        return
      }

      if (data.success) {
        setSubmitted(true)
      }
    } catch {
      setUploadError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForceSubmit = async () => {
    if (!token) return
    setSubmitting(true)
    setShowSubmitModal(false)

    try {
      const res = await fetch(`${API_URL}/api/upload/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })

      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      }
    } catch {
      setUploadError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-crimson border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-warm">Loading upload portal...</p>
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-light p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-soft/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal mb-2">Invalid Upload Link</h2>
          <p className="text-gray-warm text-sm">This upload link is invalid or has been deactivated. Please contact your BaxterLabs advisor.</p>
        </div>
      </div>
    )
  }

  // --- Expired state ---
  if (expired) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-light p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal mb-2">Upload Link Expired</h2>
          <p className="text-gray-warm text-sm mb-4">This upload link has expired. Please contact your advisor to request a new one.</p>
          <a href={`mailto:${contactEmail}`} className="text-teal font-semibold hover:underline">{contactEmail}</a>
        </div>
      </div>
    )
  }

  if (!status) return null

  const { checklist, progress } = status
  const progressPct = progress.required_total > 0 ? Math.round((progress.required_uploaded / progress.required_total) * 100) : 0
  const allRequiredDone = progress.required_uploaded >= progress.required_total

  // Group by category
  const byCategory: Record<string, ChecklistItem[]> = {}
  for (const item of checklist) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <header className="bg-crimson">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
          <img src="/baxterlabs-logo-white-text.png" alt="BaxterLabs Advisory" className="h-10" />
          <div className="border-l border-white/30 pl-4">
            <h1 className="text-white font-display text-lg font-bold leading-tight">Document Upload Portal</h1>
            <p className="text-white/70 text-sm">{status.company_name}</p>
          </div>
        </div>
      </header>
      <div className="h-[3px] bg-gold" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Submitted / read-only state */}
        {submitted && (
          <div className="bg-green/10 border border-green/30 rounded-xl p-6 mb-8 text-center">
            <svg className="w-12 h-12 text-green mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="font-display text-xl font-bold text-charcoal mb-1">Documents Submitted</h2>
            <p className="text-gray-warm text-sm">Thank you! Your documents have been received. Your advisor {status.partner_lead} will be in touch.</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-gray-light p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-charcoal text-sm">Upload Progress</h2>
            <span className="text-sm text-gray-warm">
              <span className="font-bold text-teal">{progress.required_uploaded}</span> of {progress.required_total} required documents received
            </span>
          </div>
          <div className="w-full h-3 bg-gray-light rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progress.total_uploaded > progress.required_uploaded && (
            <p className="text-xs text-gray-warm mt-2">{progress.total_uploaded} total documents uploaded (including optional)</p>
          )}
        </div>

        {/* Upload error banner */}
        {uploadError && (
          <div className="bg-red-soft/10 border border-red-soft/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-soft text-sm flex-1">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="text-red-soft/60 hover:text-red-soft">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Category Sections */}
        {CATEGORY_ORDER.map(cat => {
          const items = byCategory[cat] || []
          if (items.length === 0) return null
          const isExpanded = expandedCategories.has(cat)
          const catUploaded = items.filter(i => i.uploaded).length

          return (
            <section key={cat} className="bg-white rounded-xl border border-gray-light mb-4 overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-ivory/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-base font-bold text-crimson">{CATEGORY_LABELS[cat]}</h3>
                  <span className="text-xs text-gray-warm bg-gray-light px-2 py-0.5 rounded-full">
                    {catUploaded}/{items.length}
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-warm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-light divide-y divide-gray-light">
                  {items.map(item => (
                    <div key={item.key} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-charcoal text-sm">{item.name}</span>
                            {priorityBadge(item.priority)}
                          </div>
                          {item.notes && <p className="text-xs text-gray-warm mt-0.5">{item.notes}</p>}
                        </div>
                      </div>

                      {/* Upload slot */}
                      {item.uploaded ? (
                        <div className="flex items-center gap-3 bg-green/5 border border-green/20 rounded-lg px-4 py-3">
                          <svg className="w-5 h-5 text-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-charcoal font-medium truncate">{item.filename}</p>
                            <p className="text-xs text-gray-warm">
                              {item.file_size ? formatFileSize(item.file_size) : ''}{item.uploaded_at ? ` · ${formatDate(item.uploaded_at)}` : ''}
                            </p>
                          </div>
                          {!submitted && (
                            <button
                              onClick={() => fileInputRefs.current[item.key]?.click()}
                              className="text-xs text-teal font-semibold hover:underline flex-shrink-0"
                            >
                              Replace
                            </button>
                          )}
                          <input
                            ref={el => { fileInputRefs.current[item.key] = el }}
                            type="file"
                            className="hidden"
                            accept={[...ALLOWED_EXTENSIONS].join(',')}
                            onChange={e => handleFileSelect(e, item.key)}
                          />
                        </div>
                      ) : submitted ? (
                        <div className="bg-gray-light/50 border border-gray-light rounded-lg px-4 py-3 text-center">
                          <p className="text-xs text-gray-warm">Not uploaded</p>
                        </div>
                      ) : uploadingKey === item.key ? (
                        <div className="flex items-center justify-center gap-2 bg-teal/5 border border-teal/20 rounded-lg px-4 py-4">
                          <div className="animate-spin w-5 h-5 border-2 border-teal border-t-transparent rounded-full" />
                          <span className="text-sm text-teal font-medium">Uploading...</span>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed border-gray-light rounded-lg px-4 py-4 text-center hover:border-teal/50 hover:bg-teal/5 transition-colors cursor-pointer"
                          onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                          onDrop={e => handleDrop(e, item.key)}
                          onClick={() => fileInputRefs.current[item.key]?.click()}
                        >
                          <svg className="w-6 h-6 text-gray-warm mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <p className="text-sm text-gray-warm">
                            Drag & drop or <span className="text-teal font-semibold">choose file</span>
                          </p>
                          <p className="text-[10px] text-gray-warm mt-1">PDF, Excel, CSV, Word, or images · 50MB max</p>
                          <input
                            ref={el => { fileInputRefs.current[item.key] = el }}
                            type="file"
                            className="hidden"
                            accept={[...ALLOWED_EXTENSIONS].join(',')}
                            onChange={e => handleFileSelect(e, item.key)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* Submit Button */}
        {!submitted && (
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={submitting || progress.total_uploaded === 0}
              className={`px-8 py-3.5 rounded-xl font-bold text-white text-base transition-colors ${
                allRequiredDone
                  ? 'bg-green hover:bg-green/90'
                  : 'bg-amber hover:bg-amber/90'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? 'Submitting...' : allRequiredDone
                ? 'Submit Documents'
                : `Submit Documents (${progress.required_total - progress.required_uploaded} required items missing)`
              }
            </button>
            {!allRequiredDone && progress.total_uploaded > 0 && (
              <p className="text-xs text-gray-warm mt-2">You can still submit with missing items — your advisor will follow up.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-light text-center">
          <p className="text-xs text-gray-warm">
            Questions? Contact <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a>
          </p>
          <p className="text-[10px] text-gray-warm mt-1">&copy; 2026 BaxterLabs Advisory</p>
        </footer>
      </main>

      {/* Missing Items Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-charcoal/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-display text-lg font-bold text-charcoal mb-2">Missing Required Documents</h3>
            <p className="text-sm text-gray-warm mb-4">
              The following {missingItems.length} required document{missingItems.length > 1 ? 's have' : ' has'} not been uploaded:
            </p>
            <ul className="space-y-1 mb-6 max-h-48 overflow-y-auto">
              {missingItems.map(item => (
                <li key={item.key} className="flex items-center gap-2 text-sm text-charcoal">
                  <svg className="w-4 h-4 text-amber flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {item.name}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-light rounded-lg text-sm font-semibold text-charcoal hover:bg-ivory transition-colors"
              >
                Go Back & Upload
              </button>
              <button
                onClick={handleForceSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-amber text-white rounded-lg text-sm font-bold hover:bg-amber/90 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
