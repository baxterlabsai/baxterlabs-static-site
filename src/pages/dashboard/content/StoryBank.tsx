import { useEffect, useState, useCallback } from 'react'
import { apiGet } from '../../../lib/api'
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

export default function StoryBank() {
  const [stories, setStories] = useState<StoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const reload = useCallback(() => {
    const params = categoryFilter !== 'All' ? `?category=${encodeURIComponent(categoryFilter)}` : ''
    apiGet<StoryEntry[]>(`/api/story-bank${params}`)
      .then(setStories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [categoryFilter])

  useEffect(() => { reload() }, [reload])

  useRealtimeRefresh('story-bank', reload, ['story_bank'])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal font-display">Story Bank</h1>
        <p className="text-sm text-charcoal/60 mt-1">Engagement findings organized for content reuse</p>
      </div>

      {/* Category filter */}
      <div className="mb-5">
        <select
          value={categoryFilter}
          onChange={e => { setLoading(true); setCategoryFilter(e.target.value) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-charcoal"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {loading ? (
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
                {s.used_in_post && (
                  <span className="text-[10px] font-medium text-emerald-600">Used</span>
                )}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
