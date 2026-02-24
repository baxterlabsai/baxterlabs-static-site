import { useEffect } from 'react'

interface SEOProps {
  title: string
  description: string
  ogImage?: string
}

export default function SEO({ title, description, ogImage }: SEOProps) {
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

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', window.location.href)
    if (ogImage) {
      setMeta('property', 'og:image', ogImage)
    }
  }, [title, description, ogImage])

  return null
}
