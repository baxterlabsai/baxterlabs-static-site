import { useEffect, useState, type ReactNode } from 'react'
import { apiGet } from '../../lib/api'

interface PhasePrompt {
  phase: number
  name: string
  description: string
  timing: string
  template_text: string
  variables: string[]
  version: number
}

const REVIEW_GATE_PHASES = new Set([1, 3, 6])

function highlightVariables(text: string): ReactNode[] {
  const parts = text.split(/(\{[^}]+\})/)
  return parts.map((part, i) => {
    if (/^\{[^}]+\}$/.test(part)) {
      return (
        <span
          key={i}
          className="bg-teal/10 text-teal px-1 rounded font-semibold"
        >
          {part}
        </span>
      )
    }
    return part
  })
}

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<PhasePrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)

  useEffect(() => {
    apiGet<{ prompts: PhasePrompt[]; count: number }>('/api/prompts')
      .then(data => {
        const sorted = [...data.prompts].sort((a, b) => a.phase - b.phase)
        setPrompts(sorted)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const togglePhase = (phase: number) => {
    setExpandedPhase(prev => (prev === phase ? null : phase))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Phase Prompt Library</h1>
        <p className="text-gray-warm text-sm mt-1">
          8-phase engagement methodology. Click any phase to view the full prompt template.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {prompts.length === 0 && !error ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">No prompts loaded</p>
          <p className="text-gray-warm text-sm">Phase prompts have not been seeded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map(prompt => {
            const isExpanded = expandedPhase === prompt.phase
            const hasReviewGate = REVIEW_GATE_PHASES.has(prompt.phase)

            return (
              <div
                key={prompt.phase}
                className="bg-white rounded-lg border border-gray-light overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => togglePhase(prompt.phase)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 cursor-pointer"
                >
                  {/* Phase number badge */}
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-crimson text-white flex items-center justify-center text-sm font-bold mt-0.5">
                    {prompt.phase}
                  </span>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-charcoal">{prompt.name}</span>
                      <span className="text-gray-warm text-xs">{prompt.timing}</span>

                      {hasReviewGate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 text-amber text-xs">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                          </svg>
                          Review Gate
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-warm mt-1">{prompt.description}</p>
                  </div>

                  {/* Variable count pill + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-light text-charcoal">
                      {prompt.variables.length} variable{prompt.variables.length !== 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-warm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5">
                    <div className="bg-ivory rounded-lg p-4">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-charcoal leading-relaxed">
                        {highlightVariables(prompt.template_text)}
                      </pre>
                    </div>

                    {/* Variables section */}
                    {prompt.variables.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-warm uppercase tracking-wider mb-2">
                          Variables
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {prompt.variables.map(v => (
                            <span
                              key={v}
                              className="bg-teal/10 text-teal px-2 py-1 rounded text-xs font-semibold font-mono"
                            >
                              {`{${v}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Version tag */}
                    <div className="mt-3 text-right">
                      <span className="text-xs text-gray-warm">v{prompt.version}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
