import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../lib/api'
import { useToast } from './Toast'
import SectionErrorBoundary from './SectionErrorBoundary'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ApprovalStatus = 'pending' | 'approved' | 'fix_requested'

interface Graphic {
  id: string
  chart_type: string
  storage_path: string | null
  storage_bucket: string | null
  signed_url: string | null
  output_placements: number[] | null
  status: string
  approval_status: ApprovalStatus
  fix_instructions: string | null
  fix_requested_at: string | null
  approved_at: string | null
  created_at: string
}

interface Summary {
  total: number
  pending: number
  approved: number
  fix_requested: number
}

interface GraphicsResponse {
  graphics: Graphic[]
  summary: Summary
}

interface ApproveAllResponse {
  updated_count: number
  summary: Summary
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** snake_case → Title Case. e.g. "revenue_leak_grouped" → "Revenue Leak Grouped". */
function formatChartName(chartType: string): string {
  return chartType
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const OUTPUT_LABELS: Record<number, string> = {
  1: 'Executive Summary',
  2: 'Full Diagnostic Report',
  3: 'Presentation Deck',
  4: 'Implementation Roadmap',
  5: 'Retainer Proposal',
}

function outputPlacementLabels(placements: number[] | null): string {
  if (!placements || placements.length === 0) return 'Not placed'
  return placements.map(n => OUTPUT_LABELS[n] || `Output ${n}`).join(', ')
}

/**
 * The Cowork parser breaks on em dashes and en dashes — strip them from any
 * string that will be copied into a Cowork command. Replaces with a regular
 * hyphen to preserve readability. Do not remove.
 */
function sanitizeForCowork(text: string): string {
  return text.replace(/[\u2014\u2013]/g, '-')
}

function buildFixCommand(graphicId: string, instructions: string): string {
  const safeInstructions = sanitizeForCowork(instructions).replace(/"/g, '\\"')
  return `/baxterlabs-delivery:fix-graphic ${graphicId} "${safeInstructions}"`
}

/* ------------------------------------------------------------------ */
/*  Main component (wraps inner in error boundary)                     */
/* ------------------------------------------------------------------ */

interface Props {
  engagementId: string
}

export default function GraphicsReview({ engagementId }: Props) {
  return (
    <SectionErrorBoundary
      label="EngagementDetail.GraphicsReview"
      fallback={
        <div className="border rounded-lg overflow-hidden border-gray-light">
          <div className="w-full px-4 py-3 flex items-center gap-3">
            <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.73-3l-7.07-12a2 2 0 00-3.46 0l-7.07 12a2 2 0 001.73 3z" />
              </svg>
            </span>
            <div className="min-w-0">
              <span className="font-semibold text-charcoal text-sm">Graphics Review</span>
              <p className="text-xs text-gray-warm mt-0.5 italic">Could not be displayed — reload the page to try again.</p>
            </div>
          </div>
        </div>
      }
    >
      <GraphicsReviewInner engagementId={engagementId} />
    </SectionErrorBoundary>
  )
}

/* ------------------------------------------------------------------ */
/*  Inner component — grid, modal, all state                          */
/* ------------------------------------------------------------------ */

function GraphicsReviewInner({ engagementId }: Props) {
  const { toast } = useToast()

  const [graphics, setGraphics] = useState<Graphic[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Default: closed. Auto-open ONCE on first load if review work exists so
  // the user sees newly-generated graphics as they finish Phase 3; after that
  // the user's manual toggle state is preserved across refetches.
  const [collapsed, setCollapsed] = useState(true)
  const hasAutoExpanded = useRef(false)

  const [modalIdx, setModalIdx] = useState<number | null>(null)
  const [showFixForm, setShowFixForm] = useState(false)
  const [fixText, setFixText] = useState('')
  const [submittingFix, setSubmittingFix] = useState(false)
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [imageErrorIds, setImageErrorIds] = useState<Set<string>>(new Set())
  const [approveAllConfirm, setApproveAllConfirm] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)

  /* Fetch graphics + summary */
  const fetchGraphics = useCallback(async () => {
    try {
      const data = await apiGet<GraphicsResponse>(`/api/engagements/${engagementId}/graphics`)
      setGraphics(data.graphics || [])
      setSummary(data.summary || null)
      setLoadError(null)
      // Auto-open once on first load IF there is review work to do. Otherwise
      // stay closed (the default). This mirrors how the Phase Outputs
      // accordion auto-expands the active phase only when it's the one that
      // just finished.
      if (!hasAutoExpanded.current && data.summary && data.summary.total > 0) {
        if (data.summary.pending > 0 || data.summary.fix_requested > 0) {
          setCollapsed(false)
        }
        hasAutoExpanded.current = true
      }
    } catch (e) {
      console.error('[GraphicsReview] fetch failed:', e)
      setLoadError(e instanceof Error ? e.message : 'Failed to load graphics')
    } finally {
      setLoading(false)
    }
  }, [engagementId])

  useEffect(() => {
    setLoading(true)
    hasAutoExpanded.current = false
    fetchGraphics()
  }, [fetchGraphics])

  /* Mutate helpers — optimistic card update then refetch summary */
  const patchLocal = useCallback((id: string, patch: Partial<Graphic>) => {
    setGraphics(prev => prev ? prev.map(g => g.id === id ? { ...g, ...patch } : g) : prev)
  }, [])

  const handleApprove = useCallback(async (id: string) => {
    setApprovingIds(prev => new Set(prev).add(id))
    patchLocal(id, { approval_status: 'approved', approved_at: new Date().toISOString(), fix_instructions: null, fix_requested_at: null })
    try {
      await apiPatch<Graphic>(`/api/engagement-graphics/${id}/approve`)
      await fetchGraphics()
    } catch (e) {
      console.error('[GraphicsReview] approve failed:', e)
      toast('Failed to approve graphic', 'error')
      await fetchGraphics()
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [patchLocal, fetchGraphics, toast])

  const handleReset = useCallback(async (id: string) => {
    patchLocal(id, { approval_status: 'pending', approved_at: null, fix_instructions: null, fix_requested_at: null })
    try {
      await apiPatch<Graphic>(`/api/engagement-graphics/${id}/reset`)
      await fetchGraphics()
    } catch (e) {
      console.error('[GraphicsReview] reset failed:', e)
      toast('Failed to reset graphic', 'error')
      await fetchGraphics()
    }
  }, [patchLocal, fetchGraphics, toast])

  const handleSubmitFix = useCallback(async (id: string) => {
    const instructions = fixText.trim()
    if (!instructions) return

    // Copy to clipboard FIRST — mirrors copyPhaseCommand in EngagementDetail.tsx.
    // The clipboard write MUST be the first await in the function chain from the
    // click handler, otherwise the user-gesture transient activation that
    // navigator.clipboard.writeText requires has already been consumed by the
    // prior await (e.g. apiPatch) and the modern API throws. Do not reorder.
    const command = buildFixCommand(id, instructions)
    try {
      await navigator.clipboard.writeText(command)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = command
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }

    setSubmittingFix(true)
    try {
      await apiPatch<Graphic>(`/api/engagement-graphics/${id}/request-fix`, { fix_instructions: instructions })
      patchLocal(id, { approval_status: 'fix_requested', fix_instructions: instructions, fix_requested_at: new Date().toISOString(), approved_at: null })
      toast('Fix request saved. Cowork command copied to clipboard.', 'success', 8000)
      setShowFixForm(false)
      setFixText('')
      await fetchGraphics()
    } catch (e) {
      console.error('[GraphicsReview] fix request failed:', e)
      toast('Fix request failed to save (command still copied to clipboard).', 'error')
    } finally {
      setSubmittingFix(false)
    }
  }, [fixText, patchLocal, fetchGraphics, toast])

  const handleApproveAll = useCallback(async () => {
    setApprovingAll(true)
    try {
      const data = await apiPost<ApproveAllResponse>(`/api/engagements/${engagementId}/graphics/approve-all`)
      toast(`Approved ${data.updated_count} pending graphic${data.updated_count === 1 ? '' : 's'}`, 'success')
      await fetchGraphics()
    } catch (e) {
      console.error('[GraphicsReview] approve all failed:', e)
      toast('Failed to approve all pending graphics', 'error')
    } finally {
      setApprovingAll(false)
      setApproveAllConfirm(false)
    }
  }, [engagementId, fetchGraphics, toast])

  /* Modal keyboard navigation */
  useEffect(() => {
    if (modalIdx === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalIdx(null)
        setShowFixForm(false)
        setFixText('')
      } else if (e.key === 'ArrowRight' && graphics && modalIdx < graphics.length - 1) {
        setModalIdx(modalIdx + 1)
        setShowFixForm(false)
        setFixText('')
      } else if (e.key === 'ArrowLeft' && modalIdx > 0) {
        setModalIdx(modalIdx - 1)
        setShowFixForm(false)
        setFixText('')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [modalIdx, graphics])

  const modalGraphic = useMemo(() => {
    if (modalIdx === null || !graphics) return null
    return graphics[modalIdx] || null
  }, [modalIdx, graphics])

  /* Don't render at all if this engagement has no graphics yet */
  if (!loading && (graphics === null || graphics.length === 0) && !loadError) {
    return null
  }

  const allApproved = !!summary && summary.total > 0 && summary.pending === 0 && summary.fix_requested === 0
  const subtitle = summary
    ? `${summary.approved} of ${summary.total} approved${summary.fix_requested > 0 ? ` · ${summary.fix_requested} fix requested` : ''}${summary.pending > 0 ? ` · ${summary.pending} pending` : ''}`
    : 'Loading…'

  return (
    <>
      <div className="border rounded-lg overflow-hidden border-gray-light">
        {/* Header — matches the phase accordion item style */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-ivory/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              allApproved ? 'bg-teal text-white' : 'bg-crimson text-white'
            }`}>
              {allApproved ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-charcoal text-sm">Graphics Review</span>
              </div>
              <p className="text-xs text-gray-warm mt-0.5">{subtitle}</p>
            </div>
          </div>
          <svg className={`flex-shrink-0 w-4 h-4 text-gray-warm transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!collapsed && (
          <div className="border-t border-gray-light p-4 space-y-4">
            {/* Approve All Pending toolbar — mirrors the "Generate Graphics" */}
            {/* toolbar row inside Phase 3's expanded content.                */}
            {summary && summary.pending > 0 && (
              <div className="bg-ivory rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-charcoal">
                  <span className="font-semibold">{summary.pending}</span> chart{summary.pending === 1 ? '' : 's'} pending review
                </p>
                {approveAllConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-warm">Approve all {summary.pending}?</span>
                    <button
                      onClick={handleApproveAll}
                      disabled={approvingAll}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-green text-white text-xs font-semibold rounded-lg hover:bg-green/90 disabled:opacity-50 transition-colors"
                    >
                      {approvingAll ? 'Approving…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setApproveAllConfirm(false)}
                      disabled={approvingAll}
                      className="px-2.5 py-1 text-xs font-semibold text-gray-warm hover:text-charcoal"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setApproveAllConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green text-white text-xs font-semibold rounded-lg hover:bg-green/90 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Approve All Pending
                  </button>
                )}
              </div>
            )}

            {loading && <GraphicsSkeletonGrid />}

            {loadError && !loading && (
              <div className="text-sm text-red-600 py-4">
                Failed to load graphics: {loadError}
                <button
                  onClick={fetchGraphics}
                  className="ml-3 text-teal font-semibold hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !loadError && graphics && graphics.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {graphics.map((g, idx) => (
                  <GraphicCard
                    key={g.id}
                    graphic={g}
                    isApproving={approvingIds.has(g.id)}
                    imageErrored={imageErrorIds.has(g.id)}
                    onOpen={() => {
                      setModalIdx(idx)
                      setShowFixForm(false)
                      setFixText('')
                    }}
                    onQuickApprove={() => handleApprove(g.id)}
                    onImageError={() => setImageErrorIds(prev => new Set(prev).add(g.id))}
                    onImageRetry={() => setImageErrorIds(prev => {
                      const next = new Set(prev)
                      next.delete(g.id)
                      return next
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modalGraphic && graphics && (
        <GraphicModal
          graphic={modalGraphic}
          index={modalIdx!}
          total={graphics.length}
          showFixForm={showFixForm}
          fixText={fixText}
          submittingFix={submittingFix}
          onClose={() => {
            setModalIdx(null)
            setShowFixForm(false)
            setFixText('')
          }}
          onPrev={() => {
            if (modalIdx !== null && modalIdx > 0) {
              setModalIdx(modalIdx - 1)
              setShowFixForm(false)
              setFixText('')
            }
          }}
          onNext={() => {
            if (modalIdx !== null && modalIdx < graphics.length - 1) {
              setModalIdx(modalIdx + 1)
              setShowFixForm(false)
              setFixText('')
            }
          }}
          onApprove={() => handleApprove(modalGraphic.id)}
          onRevealFixForm={() => setShowFixForm(true)}
          onHideFixForm={() => {
            setShowFixForm(false)
            setFixText('')
          }}
          onChangeFixText={setFixText}
          onSubmitFix={() => handleSubmitFix(modalGraphic.id)}
          onReset={() => handleReset(modalGraphic.id)}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  GraphicCard                                                        */
/* ------------------------------------------------------------------ */

interface GraphicCardProps {
  graphic: Graphic
  isApproving: boolean
  imageErrored: boolean
  onOpen: () => void
  onQuickApprove: () => void
  onImageError: () => void
  onImageRetry: () => void
}

function GraphicCard({ graphic, isApproving, imageErrored, onOpen, onQuickApprove, onImageError, onImageRetry }: GraphicCardProps) {
  const displayName = formatChartName(graphic.chart_type)
  const isApproved = graphic.approval_status === 'approved'
  const isFixRequested = graphic.approval_status === 'fix_requested'

  return (
    <div
      className={`relative bg-ivory rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isApproved ? 'border-green/60 ring-1 ring-green/30' :
        isFixRequested ? 'border-amber-400' :
        'border-gray-light'
      }`}
    >
      {isFixRequested && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-bold text-center py-1 z-10 uppercase tracking-wide">
          Fix Requested
        </div>
      )}
      {isApproved && (
        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-green/90 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <button
        onClick={onOpen}
        className={`block w-full bg-white ${isFixRequested ? 'pt-6' : ''}`}
        aria-label={`Open ${displayName}`}
      >
        {graphic.signed_url && !imageErrored ? (
          <img
            src={graphic.signed_url}
            alt={displayName}
            loading="lazy"
            onError={onImageError}
            className="w-full h-48 object-contain bg-white"
          />
        ) : (
          <div className="w-full h-48 flex flex-col items-center justify-center text-gray-warm bg-gray-50">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.73-3l-7.07-12a2 2 0 00-3.46 0l-7.07 12a2 2 0 001.73 3z" />
            </svg>
            <span className="text-xs">Failed to load</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onImageRetry()
              }}
              className="text-xs text-teal font-semibold mt-1 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </button>

      <div className="px-3 py-2 flex items-center justify-between gap-2 bg-ivory">
        <p className="text-sm font-semibold text-charcoal truncate">{displayName}</p>
        {!isApproved && (
          <button
            onClick={onQuickApprove}
            disabled={isApproving}
            title="Quick approve"
            className="flex-shrink-0 w-7 h-7 rounded-full bg-green/10 hover:bg-green/20 text-green flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Quick approve"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  GraphicModal                                                        */
/* ------------------------------------------------------------------ */

interface GraphicModalProps {
  graphic: Graphic
  index: number
  total: number
  showFixForm: boolean
  fixText: string
  submittingFix: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onApprove: () => void
  onRevealFixForm: () => void
  onHideFixForm: () => void
  onChangeFixText: (v: string) => void
  onSubmitFix: () => void
  onReset: () => void
}

function GraphicModal(props: GraphicModalProps) {
  const { graphic, index, total, showFixForm, fixText, submittingFix } = props
  const displayName = formatChartName(graphic.chart_type)
  const isApproved = graphic.approval_status === 'approved'
  const isFixRequested = graphic.approval_status === 'fix_requested'
  const hasPrev = index > 0
  const hasNext = index < total - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      className="fixed inset-0 z-[60] bg-black/80 flex flex-col"
      onClick={props.onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-light flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-display font-bold text-charcoal truncate">{displayName}</h2>
          <span className="text-xs text-gray-warm flex-shrink-0">
            {index + 1} of {total}
          </span>
          <StatusBadge status={graphic.approval_status} />
        </div>
        <button
          onClick={props.onClose}
          className="text-gray-warm hover:text-charcoal p-1 rounded-lg hover:bg-ivory transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Image area with nav arrows */}
      <div className="flex-1 flex items-center justify-center p-8 relative min-h-0" onClick={e => e.stopPropagation()}>
        {hasPrev && (
          <button
            onClick={props.onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-charcoal flex items-center justify-center shadow-lg transition-colors"
            aria-label="Previous graphic"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {graphic.signed_url ? (
          <img
            src={graphic.signed_url}
            alt={displayName}
            className="max-w-full max-h-full object-contain bg-white rounded-lg shadow-xl"
          />
        ) : (
          <div className="bg-white rounded-lg p-12 text-gray-warm">Image unavailable</div>
        )}
        {hasNext && (
          <button
            onClick={props.onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-charcoal flex items-center justify-center shadow-lg transition-colors"
            aria-label="Next graphic"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Footer — metadata + actions */}
      <div className="bg-white border-t border-gray-light px-8 py-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-6 mb-3">
            <div className="text-xs text-gray-warm space-y-1">
              <p><span className="font-semibold">Type:</span> {graphic.chart_type}</p>
              <p><span className="font-semibold">Appears in:</span> {outputPlacementLabels(graphic.output_placements)}</p>
              {isFixRequested && graphic.fix_instructions && (
                <p className="text-amber-700"><span className="font-semibold">Fix requested:</span> {graphic.fix_instructions}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(isApproved || isFixRequested) && (
                <button
                  onClick={props.onReset}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-warm hover:text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
                >
                  Reset to Pending
                </button>
              )}
              {!isApproved && (
                <button
                  onClick={props.onApprove}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold rounded-lg hover:bg-green/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
              )}
              {!showFixForm && !isFixRequested && (
                <button
                  onClick={props.onRevealFixForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Request Fix
                </button>
              )}
            </div>
          </div>

          {showFixForm && (
            <div className="mt-3 border-t border-gray-light pt-3">
              <textarea
                value={fixText}
                onChange={e => props.onChangeFixText(e.target.value)}
                placeholder="Describe what needs to change..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-light rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={props.onHideFixForm}
                  disabled={submittingFix}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-warm hover:text-charcoal"
                >
                  Cancel
                </button>
                <button
                  onClick={props.onSubmitFix}
                  disabled={!fixText.trim() || submittingFix}
                  className="px-4 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {submittingFix ? 'Submitting...' : 'Submit Fix Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small sub-components                                                */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ApprovalStatus }) {
  if (status === 'approved') {
    return (
      <span className="text-xs font-semibold text-green bg-green/10 px-2 py-0.5 rounded-full">Approved</span>
    )
  }
  if (status === 'fix_requested') {
    return (
      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Fix Requested</span>
    )
  }
  return (
    <span className="text-xs font-semibold text-gray-warm bg-ivory px-2 py-0.5 rounded-full">Pending</span>
  )
}

function GraphicsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-ivory rounded-lg border border-gray-light overflow-hidden animate-pulse">
          <div className="w-full h-48 bg-gray-200" />
          <div className="px-3 py-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
