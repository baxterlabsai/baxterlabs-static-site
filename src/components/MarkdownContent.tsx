import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
  className?: string
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

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose-bl ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{fixMarkdownTables(content)}</ReactMarkdown>
    </div>
  )
}
