import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SEO from '../components/SEO'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Post {
  id: string
  title: string
  blog_slug: string
  seo_title: string | null
  seo_description: string | null
  featured_image_url: string | null
  published_date: string | null
  body: string | null
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_URL}/api/public/blog/${slug}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); return null }
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: Post | null) => { if (data) setPost(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!post) return
    // Set canonical link
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = `https://baxterlabs.ai/blog/${post.blog_slug}`
    return () => { if (link) link.remove() }
  }, [post])

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-[680px] mx-auto px-4 sm:px-6 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
          <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-3/4 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-1/2 bg-gray-200 rounded mb-6" />
          <div className="h-px w-full bg-gray-200 mb-8" />
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 w-full bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (notFound || !post) {
    return (
      <>
        <SEO
          title="Post Not Found | BaxterLabs Advisory"
          description="The blog post you're looking for doesn't exist."
        />
        <section className="bg-ivory py-16 md:py-20">
          <div className="max-w-[680px] mx-auto px-4 sm:px-6 text-center">
            <h1 className="font-display text-3xl font-bold text-crimson mb-4">
              Post not found
            </h1>
            <p className="text-charcoal/60 mb-6">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/blog" className="text-teal font-medium hover:underline">
              ← Back to Insights
            </Link>
          </div>
        </section>
      </>
    )
  }

  const seoTitle = post.seo_title || post.title
  const seoDesc = post.seo_description || ''

  return (
    <>
      <SEO
        title={`${seoTitle} | BaxterLabs Advisory`}
        description={seoDesc}
        ogImage={post.featured_image_url || undefined}
      />

      <section className="bg-ivory py-12 md:py-16">
        <div className="max-w-[680px] mx-auto px-4 sm:px-6">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center text-teal font-medium text-sm hover:underline mb-8"
          >
            ← Back to Insights
          </Link>

          {/* Post header */}
          <header className="mb-8">
            {post.published_date && (
              <p className="text-sm text-charcoal/50 mb-2">
                {formatDate(post.published_date)}
              </p>
            )}
            <h1 className="font-display text-3xl md:text-4xl font-bold text-crimson leading-tight">
              {post.title}
            </h1>
            <hr className="mt-6 border-t-2 border-gold" />
          </header>

          {/* Post body */}
          <article className="blog-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.body || ''}
            </ReactMarkdown>
          </article>

          {/* CTA */}
          <div className="mt-12 pt-8 border-t-2 border-gold">
            <h2 className="font-display text-2xl font-bold text-crimson mb-3">
              Is this pattern showing up in your firm?
            </h2>
            <p className="text-charcoal leading-relaxed mb-6">
              BaxterLabs Advisory delivers 14-day profit diagnostics for professional
              service firms with $5M–$50M in revenue. We find the margin leakage your
              accountant doesn't report.
            </p>
            <Link
              to="/#services"
              className="inline-flex items-center justify-center px-6 h-12 bg-teal text-white font-semibold rounded-lg transition-colors hover:bg-teal/90"
            >
              Learn More About the Diagnostic
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
