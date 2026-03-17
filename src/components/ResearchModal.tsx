import { useEffect, useRef } from 'react'
import MarkdownContent from './MarkdownContent'

type TabKey = 'research' | 'enrichment' | 'call_prep'

interface TabbedProps {
  title: string
  isOpen: boolean
  onClose: () => void
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  children: React.ReactNode
  content?: never
}

interface LegacyProps {
  title: string
  content: string
  isOpen: boolean
  onClose: () => void
  activeTab?: never
  onTabChange?: never
  children?: never
}

type ResearchModalProps = TabbedProps | LegacyProps

const TABS: { key: TabKey; label: string }[] = [
  { key: 'research', label: 'Research' },
  { key: 'enrichment', label: 'Enrichment' },
  { key: 'call_prep', label: 'Call Prep' },
]

export default function ResearchModal(props: ResearchModalProps) {
  const { title, isOpen, onClose } = props
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    modalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isTabbedMode = 'activeTab' in props && props.activeTab !== undefined

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-60 bg-white flex flex-col outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-light flex-shrink-0">
        <h2 className="text-lg font-display font-bold text-charcoal">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-warm hover:text-charcoal p-1 rounded-lg hover:bg-ivory transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab bar (only in tabbed mode) */}
      {isTabbedMode && (
        <div className="flex border-b border-gray-light px-8 pt-2 flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => (props as TabbedProps).onTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                (props as TabbedProps).activeTab === tab.key
                  ? 'border-purple-600 text-purple-800'
                  : 'border-transparent text-gray-warm hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {isTabbedMode ? (
          (props as TabbedProps).children
        ) : (
          <div className="prose prose-sm max-w-none text-charcoal">
            <MarkdownContent content={(props as LegacyProps).content} />
          </div>
        )}
      </div>
    </div>
  )
}
