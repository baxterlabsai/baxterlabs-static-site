import { useEffect } from 'react'

const SITE_ORIGIN = 'https://baxterlabs.ai'

interface SEOProps {
  title: string
  description: string
  ogImage?: string
  canonical?: string
}

export default function SEO({ title, description, ogImage, canonical }: SEOProps) {
  useEffect(() => {
    document.title = title

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
      if (el) {
        el.setAttribute('content', content)
      } else {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        el.content = content
        document.head.appendChild(el)
      }
    }

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (el) {
        el.setAttribute('href', href)
      } else {
        el = document.createElement('link')
        el.setAttribute('rel', rel)
        el.setAttribute('href', href)
        document.head.appendChild(el)
      }
    }

    const resolvedCanonical =
      canonical ?? `${SITE_ORIGIN}${window.location.pathname.replace(/\/+$/, '') || '/'}`

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', resolvedCanonical)
    if (ogImage) {
      setMeta('property', 'og:image', ogImage)
    }
    setLink('canonical', resolvedCanonical)
  }, [title, description, ogImage, canonical])

  return null
}
