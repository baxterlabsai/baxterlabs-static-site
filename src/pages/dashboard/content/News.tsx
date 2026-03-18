import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../../../lib/api'

interface NewsItem {
  id: string
  headline: string
  summary: string
  source_url: string | null
  source_name: string | null
  industry_tags: string[]
  post_candidate: boolean
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

  useEffect(() => {
    apiGet<NewsItem[]>('/api/content/news')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function flagAsCandidate(id: string) {
    setFlagging(id)
    try {
      await apiPatch(`/api/content/news/${id}/flag`)
      setItems(prev => prev.map(n => n.id === id ? { ...n, post_candidate: true } : n))
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
                    {item.source_name && <span>{item.source_name} · </span>}
                    {timeAgo(item.fetched_at)}
                  </p>

                  {/* Summary (2-line clamp) */}
                  <p className="text-sm text-charcoal/70 line-clamp-2 mb-2">{item.summary}</p>

                  {/* Industry tags */}
                  {item.industry_tags && item.industry_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.industry_tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal/8 text-teal"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action column */}
                <div className="flex-shrink-0">
                  {item.post_candidate ? (
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
