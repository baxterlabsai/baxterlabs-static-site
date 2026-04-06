import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPut } from '../../../lib/api'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'

interface NewsItem {
  id: string
  headline: string
  excerpt: string | null
  full_text: string | null
  source_publication: string | null
  article_url: string | null
  relevance_score: number | null
  relevance_reason: string | null
  alert_topic: string | null
  status: string
  fetched_at: string
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [flagging, setFlagging] = useState<string | null>(null)

  const reload = useCallback(() => {
    apiGet<NewsItem[]>('/api/content-news')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  useRealtimeRefresh('news', reload, ['content_news'])

  async function flagAsCandidate(id: string) {
    setFlagging(id)
    try {
      await apiPut(`/api/content-news/${id}`, { status: 'queued' })
      setItems(prev => prev.map(n => n.id === id ? { ...n, status: 'queued' } : n))
    } catch { /* ignore */ }
    setFlagging(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal font-display">News</h1>
        <p className="text-sm text-charcoal/60 mt-1">Industry news feed — flag items as content candidates</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="w-10 h-10 mx-auto text-charcoal/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            <p className="text-sm text-charcoal/40">No news items yet. News is populated by the scheduled Apify task.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Headline */}
                  <h3 className="text-sm font-bold text-charcoal mb-1">{item.headline}</h3>

                  {/* Source + time */}
                  <p className="text-[11px] text-charcoal/40 mb-2">
                    {item.source_publication && <span>{item.source_publication} · </span>}
                    {timeAgo(item.fetched_at)}
                  </p>

                  {/* Excerpt (2-line clamp) */}
                  {item.excerpt && (
                    <p className="text-sm text-charcoal/70 line-clamp-2 mb-2">{item.excerpt}</p>
                  )}

                  {/* Alert topic as badge */}
                  {item.alert_topic && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal/8 text-teal">
                      {item.alert_topic}
                    </span>
                  )}
                </div>

                {/* Action column */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {item.relevance_score != null && (
                    <span className="text-[10px] font-medium text-charcoal/40">
                      Score: {item.relevance_score}
                    </span>
                  )}
                  {item.status === 'queued' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green/10 text-green">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Candidate
                    </span>
                  ) : (
                    <button
                      disabled={flagging === item.id}
                      onClick={() => flagAsCandidate(item.id)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-charcoal/60 hover:border-teal hover:text-teal transition-colors disabled:opacity-50"
                    >
                      {flagging === item.id ? 'Flagging…' : 'Flag as candidate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
