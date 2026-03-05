import { useEffect, useRef } from 'react'
import MarkdownContent from './MarkdownContent'

interface ResearchModalProps {
  title: string
  content: string
  isOpen: boolean
  onClose: () => void
}

export default function ResearchModal({ title, content, isOpen, onClose }: ResearchModalProps) {
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="prose prose-sm max-w-none text-charcoal">
          <MarkdownContent content={content} />
        </div>
      </div>
    </div>
  )
}
