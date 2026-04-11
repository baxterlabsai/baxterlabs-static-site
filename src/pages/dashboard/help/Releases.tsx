// RELEASE NOTES IN-DASHBOARD VIEWER
//
// This page renders the Release Notes markdown from Supabase Storage
// via GET /api/help/release-notes. It is read-only — the release notes
// live at operations-manual/release-notes.md in the "manuals" bucket.
// There is no database table, no CRUD. When a new release notes file
// is uploaded to storage, the dashboard picks up the new content on
// next page load.
//
// Mirrors the Operations Manual viewer pattern (pages/dashboard/help/Manual.tsx).

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import SEO from '../../../components/SEO'
import MarkdownContent from '../../../components/MarkdownContent'
import { apiGet } from '../../../lib/api'

// ── Types ────────────────────────────────────────────────────────────────

interface ReleaseNotesResponse {
  content: string
  version: string
  updated_at: string | null
  size_bytes: number
}

interface TocVersion {
  title: string
  slug: string
}

// ── Helpers ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function parseToc(markdown: string): TocVersion[] {
  const versions: TocVersion[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const match = line.match(/^## (Version .+)/)
    if (match) {
      versions.push({ title: match[1], slug: slugify(match[1]) })
    }
  }
  return versions
}

function countMatches(text: string, query: string): number {
  if (!query) return 0
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  return (text.match(re) || []).length
}

function versionsWithMatches(markdown: string, query: string): Set<string> {
  const result = new Set<string>()
  if (!query) return result
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  const lines = markdown.split('\n')
  let currentSlug = ''

  for (const line of lines) {
    const match = line.match(/^## (Version .+)/)
    if (match) {
      currentSlug = slugify(match[1])
      if (re.test(line)) result.add(currentSlug)
      re.lastIndex = 0
      continue
    }
    if (currentSlug && re.test(line)) {
      result.add(currentSlug)
    }
    re.lastIndex = 0
  }

  return result
}

// ── Component ────────────────────────────────────────────────────────────

export default function Releases() {
  const [data, setData] = useState<ReleaseNotesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeSlug, setActiveSlug] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Fetch release notes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<ReleaseNotesResponse>('/api/help/release-notes')
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load the Release Notes.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentMatchIndex(0)
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  // IntersectionObserver for active TOC heading
  useEffect(() => {
    if (!contentRef.current || !data) return
    const headings = contentRef.current.querySelectorAll('h2[id]')
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSlug(entry.target.id)
          }
        }
      },
      { root: contentRef.current, rootMargin: '0px 0px -80% 0px', threshold: 0 }
    )

    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [data, debouncedQuery])

  // TOC data
  const toc = useMemo(() => (data ? parseToc(data.content) : []), [data])
  const matchCount = useMemo(
    () => (data ? countMatches(data.content, debouncedQuery) : 0),
    [data, debouncedQuery]
  )
  const matchingVersions = useMemo(
    () => (data ? versionsWithMatches(data.content, debouncedQuery) : new Set<string>()),
    [data, debouncedQuery]
  )

  // Navigate matches
  const jumpToMatch = useCallback(
    (index: number) => {
      const marks = contentRef.current?.querySelectorAll('mark[data-search-match]')
      if (!marks || marks.length === 0) return
      const clamped = ((index % marks.length) + marks.length) % marks.length
      setCurrentMatchIndex(clamped)
      const el = marks[clamped] as HTMLElement
      marks.forEach((m) => ((m as HTMLElement).style.backgroundColor = '#FFE066'))
      el.style.backgroundColor = '#FFC107'
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    []
  )

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchQuery('')
        setDebouncedQuery('')
        setCurrentMatchIndex(0)
      }
      if (debouncedQuery && e.key === 'Enter' && (e.target as HTMLElement)?.dataset?.searchInput) {
        e.preventDefault()
        jumpToMatch(e.shiftKey ? currentMatchIndex - 1 : currentMatchIndex + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [debouncedQuery, currentMatchIndex, jumpToMatch])

  // Scroll to heading in content panel
  const scrollToHeading = (slug: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(slug)}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTocOpen(false)
  }

  // Download handler
  const handleDownload = () => {
    if (!data) return
    const blob = new Blob([data.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BaxterLabs_Release_Notes_${data.version}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <SEO title="Release Notes — BaxterLabs" description="BaxterLabs release notes" />
        <div className="h-full flex flex-col">
          <div className="h-14 border-b border-charcoal/10 flex items-center gap-4 px-4 animate-pulse">
            <div className="h-5 w-48 bg-charcoal/10 rounded" />
            <div className="h-5 w-12 bg-charcoal/10 rounded-full" />
            <div className="flex-1" />
            <div className="h-8 w-56 bg-charcoal/10 rounded" />
            <div className="h-8 w-24 bg-charcoal/10 rounded" />
          </div>
          <div className="flex flex-1 min-h-0">
            <div className="w-72 border-r border-charcoal/10 p-4 space-y-3 animate-pulse hidden lg:block">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-charcoal/10 rounded" style={{ width: `${60 + (i % 3) * 15}%` }} />
                </div>
              ))}
            </div>
            <div className="flex-1 p-6 space-y-4 animate-pulse">
              <div className="h-8 w-3/4 bg-charcoal/10 rounded" />
              <div className="h-4 w-full bg-charcoal/5 rounded" />
              <div className="h-4 w-5/6 bg-charcoal/5 rounded" />
              <div className="h-4 w-full bg-charcoal/5 rounded" />
              <div className="h-4 w-2/3 bg-charcoal/5 rounded" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SEO title="Release Notes — BaxterLabs" description="BaxterLabs release notes" />
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-charcoal/70">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-teal text-white rounded hover:bg-teal/90 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  if (!data || !data.content) {
    return (
      <>
        <SEO title="Release Notes — BaxterLabs" description="BaxterLabs release notes" />
        <div className="flex items-center justify-center h-full">
          <p className="text-charcoal/50">The Release Notes are empty or could not be parsed.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO title="Release Notes — BaxterLabs" description="BaxterLabs release notes" />
      <div className="h-full flex flex-col manual-viewer">
        {/* Header bar */}
        <div className="shrink-0 border-b border-charcoal/10 flex items-center gap-3 px-4 py-2.5 flex-wrap sm:flex-nowrap">
          {/* Mobile TOC toggle */}
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="lg:hidden p-1.5 rounded hover:bg-charcoal/5 text-charcoal/60"
            aria-label="Toggle version list"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-lg font-display font-bold text-charcoal whitespace-nowrap">Release Notes</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal text-white whitespace-nowrap">
            {data.version}
          </span>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative flex items-center gap-1.5 order-last sm:order-none w-full sm:w-auto sm:max-w-xs">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                data-search-input="true"
                placeholder="Search release notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-charcoal/15 rounded bg-white text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
              />
            </div>
            {debouncedQuery && (
              <>
                <span className="text-xs text-charcoal/50 whitespace-nowrap">
                  {matchCount > 0
                    ? `${currentMatchIndex + 1}/${matchCount}`
                    : 'No matches'}
                </span>
                {matchCount > 1 && (
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => jumpToMatch(currentMatchIndex - 1)}
                      className="p-1 rounded hover:bg-charcoal/5 text-charcoal/60"
                      aria-label="Previous match"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => jumpToMatch(currentMatchIndex + 1)}
                      className="p-1 rounded hover:bg-charcoal/5 text-charcoal/60"
                      aria-label="Next match"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm border border-charcoal/15 rounded hover:bg-charcoal/5 text-charcoal/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>

        {/* Body: TOC + Content */}
        <div className="flex flex-1 min-h-0 relative">
          {/* Version list — desktop sidebar */}
          <nav
            className={`
              ${tocOpen ? 'translate-x-0' : '-translate-x-full'}
              lg:translate-x-0
              fixed lg:static inset-y-0 left-0 z-30
              w-72 border-r border-charcoal/10 bg-white
              overflow-y-auto overscroll-contain
              transition-transform duration-200 ease-in-out
              lg:block shrink-0
            `}
          >
            {/* Mobile close */}
            <div className="lg:hidden flex items-center justify-between p-3 border-b border-charcoal/10">
              <span className="text-sm font-semibold text-charcoal">Versions</span>
              <button onClick={() => setTocOpen(false)} className="p-1 rounded hover:bg-charcoal/5 text-charcoal/60">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 space-y-0.5">
              {toc.map((v) => {
                const hasMatch = !debouncedQuery || matchingVersions.has(v.slug)
                return (
                  <button
                    key={v.slug}
                    onClick={() => scrollToHeading(v.slug)}
                    style={{ opacity: debouncedQuery && !hasMatch ? 0.4 : 1 }}
                    className={`
                      w-full text-left text-xs font-medium text-charcoal/75 py-1.5 px-2 rounded
                      hover:bg-cream/60 transition-colors truncate
                      ${activeSlug === v.slug ? 'border-l-2 border-crimson bg-cream/40 text-charcoal/90 font-semibold' : ''}
                    `}
                  >
                    {v.title}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Mobile overlay backdrop */}
          {tocOpen && (
            <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setTocOpen(false)} />
          )}

          {/* Content panel */}
          <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
            <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <SearchHighlightedMarkdown content={data.content} query={debouncedQuery} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Search-highlighted markdown renderer ─────────────────────────────────

function SearchHighlightedMarkdown({ content, query }: { content: string; query: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = wrapperRef.current
    if (!container) return

    container.querySelectorAll('mark[data-search-match]').forEach((mark) => {
      const parent = mark.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
        parent.normalize()
      }
    })

    if (!query) return

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'gi')
    let matchIdx = 0

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent && regex.test(node.textContent)) {
        textNodes.push(node)
      }
      regex.lastIndex = 0
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || ''
      const frag = document.createDocumentFragment()
      let lastIndex = 0
      let match: RegExpExecArray | null

      regex.lastIndex = 0
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
        }
        const mark = document.createElement('mark')
        mark.setAttribute('data-search-match', String(matchIdx++))
        mark.style.backgroundColor = '#FFE066'
        mark.style.borderRadius = '2px'
        mark.style.padding = '0 1px'
        mark.textContent = match[0]
        frag.appendChild(mark)
        lastIndex = regex.lastIndex
      }
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)))
      }
      textNode.parentNode?.replaceChild(frag, textNode)
    }
  }, [query, content])

  return (
    <div ref={wrapperRef}>
      <MarkdownContent content={content} withTocAnchors />
    </div>
  )
}
