import { useState, useEffect } from 'react'
import { apiGet, apiPut } from '../../../lib/api'

interface NewsItem {
  id: string
  headline: string
  source_publication: string | null
  article_url: string
  excerpt: string | null
  relevance_score: number | null
  relevance_reason: string | null
  alert_topic: string | null
  status: string
  fetched_at: string | null
  created_at: string
}

interface NewsStats {
  unreviewed_count: number
  queued_count: number
  used_count: number
  avg_relevance_score: number | null
  last_fetched_at: string | null
}

const COMMAND_7_PROMPT = (headline: string, source: string, url: string, excerpt: string) => `I need to write a LinkedIn post responding to a news article.

Article details:
Headline: ${headline}
Source: ${source}
URL: ${url}
Excerpt: ${excerpt}

My positioning: George DeVries, Managing Partner, BaxterLabs Advisory.
I help $5M–$50M professional service firms find hidden profit leaks
through 14-day financial diagnostics. My background is in
multi-location operations and capital raises — I have been on the
inside of P&Ls at the exact scale these firms operate at.

Write a LinkedIn post that:
1. Opens with a "How I" or "The day I" hook — 8 words or fewer
2. Connects this news story to a specific profit-leak pattern
   that $5M–$50M professional service firm CEOs are experiencing
   right now
3. Adds a diagnostic insight this article didn't include —
   something only someone who has been inside these firms would know
4. Ends with a "You" section pointing it back to the reader
5. Includes the article URL on its own line at the end of the post
   so LinkedIn renders it as a rich preview card
6. Follows the SLAY framework throughout
7. Passes the ChatGPT test — must contain at least one specific
   number, ratio, or operational detail from George's background

After writing the post:
- Score it against the 10-point BaxterLabs quality checklist
- If any item scores 0, rewrite that section before delivering
- Write the final post to content_posts table in Supabase:
  type='linkedin', status='draft', title=[hook line], body=[full post]
- Confirm post ID and quality score`

type RelevanceFilter = 'all' | 'high' | 'medium' | 'low'
type StatusFilter = 'unreviewed' | 'queued' | 'used' | 'all'

export default function ContentNews() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [stats, setStats] = useState<NewsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>('high')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unreviewed')
  const [topicFilter, setTopicFilter] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (relevanceFilter === 'high') params.set('min_relevance', '7')
      else if (relevanceFilter === 'medium') params.set('min_relevance', '4')
      if (topicFilter) params.set('alert_topic', topicFilter)
      const qs = params.toString()

      const [newsData, statsData] = await Promise.all([
        apiGet<NewsItem[]>(`/api/content-news${qs ? `?${qs}` : ''}`),
        apiGet<NewsStats>('/api/content-news/stats'),
      ])

      // Client-side filter for medium (4-6) and low (1-3) upper bounds
      let filtered = newsData
      if (relevanceFilter === 'medium') {
        filtered = newsData.filter(n => (n.relevance_score ?? 0) <= 6)
      } else if (relevanceFilter === 'low') {
        filtered = newsData.filter(n => (n.relevance_score ?? 0) >= 1 && (n.relevance_score ?? 0) <= 3)
      }

      setItems(filtered)
      setStats(statsData)

      // Extract distinct topics from all news (fetch all for topic list)
      const allNews = await apiGet<NewsItem[]>('/api/content-news?status=all' as any)
      const uniqueTopics = [...new Set(allNews.map(n => n.alert_topic).filter(Boolean))] as string[]
      setTopics(uniqueTopics.sort())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [relevanceFilter, statusFilter, topicFilter])

  const handleCreatePost = async (item: NewsItem) => {
    const prompt = COMMAND_7_PROMPT(
      item.headline,
      item.source_publication || 'Unknown',
      item.article_url,
      item.excerpt || '',
    )
    await navigator.clipboard.writeText(prompt)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
    await apiPut(`/api/content-news/${item.id}`, { status: 'queued' })
    // Update local state
    setItems(prev => prev.map(n => n.id === item.id ? { ...n, status: 'queued' } : n).filter(n => statusFilter === 'all' || statusFilter === 'queued' || n.id === item.id))
  }

  const handleDismiss = async (id: string) => {
    await apiPut(`/api/content-news/${id}`, { status: 'dismissed' })
    setItems(prev => prev.filter(n => n.id !== id))
  }

  const handleQueue = async (id: string) => {
    await apiPut(`/api/content-news/${id}`, { status: 'queued' })
    setItems(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, status: 'queued' } : n)
      if (statusFilter === 'unreviewed') return updated.filter(n => n.id !== id)
      return updated
    })
  }

  const scoreBadge = (score: number | null) => {
    if (score == null) return null
    let bg = '#C0392B' // red 1-3
    if (score >= 7) bg = '#2D6A4F'
    else if (score >= 4) bg = '#D4A843'
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold"
        style={{ backgroundColor: bg }}
      >
        {score}
      </span>
    )
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#66151C]">News</h1>
        <p className="text-sm text-[#2D3436]/60 mt-1">
          Articles sourced from Google Alerts — ranked by ICP relevance
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#2D3436]/60 uppercase">Relevance</label>
          <select
            value={relevanceFilter}
            onChange={e => setRelevanceFilter(e.target.value as RelevanceFilter)}
            className="text-sm border border-gray-200 rounded px-2 py-1 bg-white text-[#2D3436]"
          >
            <option value="all">All</option>
            <option value="high">High (7-10)</option>
            <option value="medium">Medium (4-6)</option>
            <option value="low">Low (1-3)</option>
          </select>
        </div>

        {topics.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#2D3436]/60 uppercase">Topic</label>
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white text-[#2D3436]"
            >
              <option value="">All Topics</option>
              {topics.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[#2D3436]/60 uppercase">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm border border-gray-200 rounded px-2 py-1 bg-white text-[#2D3436]"
          >
            <option value="unreviewed">Unreviewed</option>
            <option value="queued">Queued</option>
            <option value="used">Used</option>
            <option value="all">All</option>
          </select>
        </div>

        {stats?.last_fetched_at && (
          <span className="ml-auto text-xs text-[#2D3436]/40">
            Last updated {formatDate(stats.last_fetched_at)}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-[#2D3436]/40 text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-[#2D3436]/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
          <p className="text-sm text-[#2D3436]/60 font-medium">No new articles yet.</p>
          <p className="text-xs text-[#2D3436]/40 mt-1">
            Google Alerts emails are checked daily. Check back tomorrow or run the news fetch manually from Cowork.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={item.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display text-base font-semibold text-[#66151C] hover:underline leading-snug"
                      >
                        {item.headline}
                      </a>
                      <p className="text-xs text-[#2D3436]/50 mt-1">
                        {item.source_publication && <span>{item.source_publication}</span>}
                        {item.source_publication && item.alert_topic && <span> · </span>}
                        {item.alert_topic && <span>{item.alert_topic}</span>}
                      </p>
                    </div>
                    {scoreBadge(item.relevance_score)}
                  </div>

                  {item.excerpt && (
                    <p className="text-sm text-[#2D3436]/80 mt-2 line-clamp-3 leading-relaxed">
                      {item.excerpt}
                    </p>
                  )}

                  {item.relevance_reason && (
                    <p className="text-sm italic text-[#005454] mt-2">
                      {item.relevance_reason}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreatePost(item)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold text-white transition-colors"
                        style={{ backgroundColor: copiedId === item.id ? '#2D3436' : '#005454' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        {copiedId === item.id ? 'Copied! Paste into Cowork' : 'Create Post'}
                      </button>
                      <button
                        onClick={() => handleQueue(item.id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded font-semibold border transition-colors text-[#005454] border-[#005454] hover:bg-[#005454]/5"
                      >
                        Queue
                      </button>
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded font-semibold border transition-colors text-[#C0392B] border-[#C0392B] hover:bg-[#C0392B]/5"
                      >
                        Dismiss
                      </button>
                    </div>
                    <span className="text-xs text-[#2D3436]/40">
                      {formatDate(item.fetched_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
