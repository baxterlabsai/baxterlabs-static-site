import { useState, useEffect } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { PluggableList } from 'unified'

interface MarkdownContentProps {
  content: string
  className?: string
  /** When true, adds rehype-slug and rehype-autolink-headings for TOC anchor support */
  withTocAnchors?: boolean
  /** Custom react-markdown component overrides (e.g. for search highlighting) */
  components?: Partial<Components>
}

/**
 * Fix markdown tables that remarkGfm can't parse:
 * 1. Collapsed tables (all rows on one line separated by `| |`)
 * 2. Tables missing the `| --- |` separator row after the header
 */
function fixMarkdownTables(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Handle collapsed tables (all rows on one line)
    if (trimmed.startsWith('|') && (trimmed.match(/\| \|/g) || []).length >= 2) {
      const rows = trimmed.replace(/\| \|/g, '|\n|').split('\n')
      if (rows.length >= 2 && !rows[1].includes('---')) {
        const colCount = (rows[0].match(/\|/g) || []).length - 1
        if (colCount > 0) {
          rows.splice(1, 0, '| ' + Array(colCount).fill('---').join(' | ') + ' |')
        }
      }
      result.push(rows.join('\n'))
      continue
    }

    result.push(lines[i])

    // Insert missing separator only after the header (first pipe row in a
    // table block). Once we insert one, skip until the table block ends.
    const prevTrimmed = i > 0 ? lines[i - 1].trim() : ''
    const isFirstPipeRow =
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      (!prevTrimmed.startsWith('|') || !prevTrimmed.endsWith('|'))

    if (
      isFirstPipeRow &&
      !trimmed.includes('---') &&
      i + 1 < lines.length
    ) {
      const nextTrimmed = lines[i + 1].trim()
      if (
        nextTrimmed.startsWith('|') &&
        nextTrimmed.endsWith('|') &&
        !nextTrimmed.includes('---')
      ) {
        const colCount = (trimmed.match(/\|/g) || []).length - 1
        if (colCount > 0) {
          result.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
        }
      }
    }
  }

  return result.join('\n')
}

export default function MarkdownContent({ content, className = '', withTocAnchors = false, components }: MarkdownContentProps) {
  const [rehypePlugins, setRehypePlugins] = useState<PluggableList>([])

  useEffect(() => {
    if (!withTocAnchors) {
      setRehypePlugins([])
      return
    }
    // Lazy-load rehype plugins only when needed
    Promise.all([
      import('rehype-slug'),
      import('rehype-autolink-headings'),
    ]).then(([slugMod, autolinkMod]) => {
      setRehypePlugins([
        slugMod.default,
        [autolinkMod.default, { behavior: 'wrap' }],
      ])
    })
  }, [withTocAnchors])

  return (
    <div className={`prose-bl ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {fixMarkdownTables(content)}
      </ReactMarkdown>
    </div>
  )
}
