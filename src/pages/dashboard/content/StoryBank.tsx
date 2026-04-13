import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'

interface StoryEntry {
  id: string
  category: string
  raw_note: string
  hook_draft: string | null
  dollar_connection: string | null
  slay_outline: { S?: string; L?: string; A?: string; Y?: string } | null
  used_in_post: boolean
  used_in_post_id: string | null
  queued_for_draft: boolean
  created_at: string
}

interface ContentIdea {
  id: string
  title: string
  description: string | null
  dollar_hook: string | null
  insider_detail: string | null
  status: string
  assigned_week: string | null
  created_at: string
}

const CATEGORIES = [
  'All',
  'Founder Journey',
  'Operational Observation',
  'Client Pattern',
  'Industry Data',
  'Personal Lesson',
  'Surprising Finding',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Founder Journey': 'bg-[#005454]/10 text-[#005454]',
  'Operational Observation': 'bg-[#C9A84C]/10 text-[#C9A84C]',
  'Client Pattern': 'bg-[#66151C]/10 text-[#66151C]',
  'Industry Data': 'bg-[#378ADD]/10 text-[#378ADD]',
  'Personal Lesson': 'bg-purple-100 text-purple-700',
  'Surprising Finding': 'bg-emerald-100 text-emerald-700',
}

const IDEA_STATUS_COLORS: Record<string, string> = {
  unused: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  used: 'bg-emerald-100 text-emerald-700',
}

type Tab = 'story_bank' | 'ideas'

export default function StoryBank() {
  const [activeTab, setActiveTab] = useState<Tab>('story_bank')

  // Story Bank state
  const [stories, setStories] = useState<StoryEntry[]>([])
  const [storiesLoading, setStoriesLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Ideas state
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [ideasFilter, setIdeasFilter] = useState('all')
  const [promoting, setPromoting] = useState<string | null>(null)
  const [queueing, setQueueing] = useState<string | null>(null)

  const reloadStories = useCallback(() => {
    const params = categoryFilter !== 'All' ? `?category=${encodeURIComponent(categoryFilter)}` : ''
    apiGet<StoryEntry[]>(`/api/story-bank${params}`)
      .then(setStories)
      .catch(() => {})
      .finally(() => setStoriesLoading(false))
  }, [categoryFilter])

  const reloadIdeas = useCallback(() => {
    const params = ideasFilter !== 'all' ? `?status=${ideasFilter}` : ''
    apiGet<ContentIdea[]>(`/api/content-ideas${params}`)
      .then(setIdeas)
      .catch(() => {})
      .finally(() => setIdeasLoading(false))
  }, [ideasFilter])

  useEffect(() => { reloadStories() }, [reloadStories])
  useEffect(() => { reloadIdeas() }, [reloadIdeas])

  useRealtimeRefresh('story-bank', reloadStories, ['story_bank'])
  useRealtimeRefresh('content-ideas', reloadIdeas, ['content_ideas'])

  async function promoteIdea(ideaId: string) {
    setPromoting(ideaId)
    try {
      await apiPost(`/api/content/ideas/${ideaId}/promote`, {})
      reloadIdeas()
      reloadStories()
    } catch { /* ignore */ }
    setPromoting(null)
  }

  async function toggleQueue(storyId: string) {
    setQueueing(storyId)
    try {
      const updated = await apiPatch<StoryEntry>(`/api/story-bank/${storyId}/queue`, {})
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, queued_for_draft: updated.queued_for_draft } : s))
    } catch { /* ignore */ }
    setQueueing(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'story_bank', label: 'Story Bank' },
    { key: 'ideas', label: 'Ideas (raw)' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal font-display">Story Bank</h1>
        <p className="text-sm text-charcoal/60 mt-1">Engagement findings organized for content reuse</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-teal text-teal'
                : 'border-transparent text-charcoal/50 hover:text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Story Bank */}
      {activeTab === 'story_bank' && (
        <div>
          {/* Category filter */}
          <div className="mb-5">
            <select
              value={categoryFilter}
              onChange={e => { setStoriesLoading(true); setCategoryFilter(e.target.value) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-charcoal"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Card grid */}
          {storiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-10 h-10 mx-auto text-charcoal/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-sm text-charcoal/40">No story bank entries yet. Story bank is populated as engagements complete.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stories.map(s => (
                <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
                  {/* Category badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-600'}`}>
                      {s.category}
                    </span>
                    {s.used_in_post ? (
                      <a
                        href="/dashboard/content/posts"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                      >
                        Drafted as post
                      </a>
                    ) : s.queued_for_draft ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal/10 text-teal">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Queued
                      </span>
                    ) : null}
                  </div>

                  {/* Hook draft as title if present */}
                  {s.hook_draft && (
                    <p className="text-sm font-semibold text-charcoal leading-snug font-display">{s.hook_draft}</p>
                  )}

                  {/* Raw note — 3-line clamp, expand on click */}
                  <p
                    className={`text-sm text-charcoal/80 leading-relaxed cursor-pointer ${expandedId !== s.id ? 'line-clamp-3' : ''}`}
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                  >
                    {s.raw_note}
                  </p>

                  {/* Dollar connection */}
                  {s.dollar_connection && (
                    <p className="text-sm text-teal font-medium leading-relaxed border-l-2 border-teal/30 pl-3">
                      {s.dollar_connection}
                    </p>
                  )}

                  {/* Queue / unqueue button */}
                  {!s.used_in_post && (
                    <button
                      disabled={queueing === s.id}
                      onClick={() => toggleQueue(s.id)}
                      className={`mt-auto self-start text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                        s.queued_for_draft
                          ? 'border-gray-200 text-charcoal/40 hover:text-red-soft hover:border-red-soft/30'
                          : 'border-gray-200 text-charcoal/60 hover:border-teal hover:text-teal'
                      }`}
                    >
                      {queueing === s.id ? (s.queued_for_draft ? 'Removing…' : 'Queueing…') : s.queued_for_draft ? 'Remove from queue' : 'Queue for draft'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ideas (raw) */}
      {activeTab === 'ideas' && (
        <div>
          {/* Status filter */}
          <div className="mb-5">
            <select
              value={ideasFilter}
              onChange={e => { setIdeasLoading(true); setIdeasFilter(e.target.value) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-charcoal"
            >
              <option value="all">All</option>
              <option value="unused">Unused</option>
              <option value="used">Used</option>
            </select>
          </div>

          {ideasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : ideas.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <svg className="w-10 h-10 mx-auto text-charcoal/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <p className="text-sm text-charcoal/40">No ideas captured yet. Ideas are created by the monthly Cowork story-bank-prompt task.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ideas.map(idea => (
                <div key={idea.id} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3">
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${IDEA_STATUS_COLORS[idea.status] || 'bg-gray-100 text-gray-600'}`}>
                      {idea.status}
                    </span>
                    <span className="text-[10px] text-charcoal/40">
                      {new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm font-semibold text-charcoal leading-snug font-display">{idea.title}</p>

                  {/* Description */}
                  {idea.description && (
                    <p className="text-sm text-charcoal/80 leading-relaxed line-clamp-3">{idea.description}</p>
                  )}

                  {/* Dollar hook */}
                  {idea.dollar_hook && (
                    <p className="text-sm text-teal font-medium leading-relaxed border-l-2 border-teal/30 pl-3">
                      {idea.dollar_hook}
                    </p>
                  )}

                  {/* Insider detail */}
                  {idea.insider_detail && (
                    <p className="text-xs text-charcoal/50 italic">{idea.insider_detail}</p>
                  )}

                  {/* Promote button */}
                  {idea.status !== 'used' && (
                    <button
                      disabled={promoting === idea.id}
                      onClick={() => promoteIdea(idea.id)}
                      className="mt-auto self-start px-3 py-1.5 text-xs font-medium rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors disabled:opacity-50"
                    >
                      {promoting === idea.id ? 'Promoting...' : 'Promote to Story Bank'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
