import { useEffect } from 'react'

interface SEOProps {
  title: string
  description: string
}

export default function SEO({ title, description }: SEOProps) {
  useEffect(() => {
    document.title = title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute('content', description)
    } else {
      const newMeta = document.createElement('meta')
      newMeta.name = 'description'
      newMeta.content = description
      document.head.appendChild(newMeta)
    }
  }, [title, description])

  return null
}
