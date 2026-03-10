import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../../lib/api'
import SEO from '../../../components/SEO'

interface Post {
  id: string
  title: string
  body: string | null
  status: string
  scheduled_date: string | null
  published_date: string | null
  published: boolean
  blog_slug: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-700',
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-200 text-gray-500',
}

type SortKey = 'created_at' | 'published_date' | 'title'

function wordCount(text: string | null): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

export default function BlogPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('created_at')
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams({ type: 'blog' })
    if (filterStatus) params.set('status', filterStatus)
    apiGet<Post[]>(`/api/content-posts?${params}`)
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
    const aVal = a[sortBy] || ''
    const bVal = b[sortBy] || ''
    return bVal.localeCompare(aVal)
  })

  return (
    <div>
      <SEO title="Blog | BaxterLabs Advisory — Dashboard" description="Manage and publish blog posts." />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-[#66151C]">Blog Posts</h1>
        <button
          onClick={() => navigate('/dashboard/content/blog/new')}
          className="bg-[#005454] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors"
        >
          + New Blog Post
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="created_at">Sort: Created Date</option>
          <option value="published_date">Sort: Published Date</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#2D3436]/60">Loading blog posts...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAF8F2] border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Scheduled</th>
                <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Published</th>
                <th className="text-right px-4 py-3 font-semibold text-[#2D3436]">Words</th>
                <th className="text-center px-4 py-3 font-semibold text-[#2D3436]">Live</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-[#2D3436]/50">No blog posts yet</td></tr>
              ) : sorted.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/dashboard/content/blog/${p.id}`)}
                  className="border-b border-gray-100 hover:bg-[#FAF8F2] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#2D3436] max-w-[300px] truncate">{p.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status] || ''}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-[#2D3436]/70">{p.scheduled_date ? new Date(p.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-[#2D3436]/70">{p.published_date ? new Date(p.published_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right text-[#2D3436]/70">{wordCount(p.body).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-3 h-3 rounded-full ${p.published ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
