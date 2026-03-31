import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface BlogPost {
  id: string
  title: string
  blog_slug: string
  seo_title: string | null
  seo_description: string | null
  featured_image_url: string | null
  published_date: string | null
  excerpt: string | null
}

// 5 minute client-side cache
let cachedData: { posts: BlogPost[]; fetchedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_TTL) {
      setPosts(cachedData.posts)
      setLoading(false)
      return
    }

    fetch(`${API_URL}/api/public/blog`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: BlogPost[]) => {
        cachedData = { posts: data, fetchedAt: Date.now() }
        setPosts(data)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <SEO
        title="Insights | BaxterLabs Advisory"
        description="Practical perspectives on financial performance, profit leakage, and operator-level decision making."
      />

      <section className="bg-surface py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-3">
              Insights
            </h1>
            <p className="text-lg text-on-surface-variant">
              Practical perspectives on financial performance, profit leakage, and operator-level decision making.
            </p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container-lowest rounded-sm border border-outline-variant/20 overflow-hidden animate-pulse">
                  <div className="aspect-[16/9] bg-surface-container" />
                  <div className="p-6">
                    <div className="h-3 w-24 bg-surface-container rounded mb-3" />
                    <div className="h-5 w-3/4 bg-surface-container rounded mb-2" />
                    <div className="h-5 w-1/2 bg-surface-container rounded mb-4" />
                    <div className="h-3 w-full bg-surface-container rounded mb-2" />
                    <div className="h-3 w-full bg-surface-container rounded mb-2" />
                    <div className="h-3 w-2/3 bg-surface-container rounded mb-4" />
                    <div className="h-4 w-24 bg-surface-container rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-on-surface-variant/60 text-lg">
                Unable to load posts right now. Please try again later.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-on-surface-variant/60 text-lg">
                No posts yet. Check back soon.
              </p>
            </div>
          )}

          {/* Post grid */}
          {!loading && !error && posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map(post => (
                <Link
                  key={post.id}
                  to={`/insights/${post.blog_slug}`}
                  className="group bg-surface-container-lowest rounded-sm border border-outline-variant/20 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="aspect-[16/9] bg-surface-container-low overflow-hidden">
                    {post.featured_image_url ? (
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {post.published_date && (
                      <p className="text-sm text-on-surface-variant/50 mb-2">
                        {formatDate(post.published_date)}
                      </p>
                    )}
                    <h2 className="font-display text-xl font-semibold text-primary mb-3 line-clamp-2 group-hover:underline">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-on-surface-variant/70 text-sm leading-relaxed line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="text-secondary font-medium text-sm group-hover:underline">
                      Read More →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
