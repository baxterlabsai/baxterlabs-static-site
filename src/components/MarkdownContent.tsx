import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Detect single-line collapsed markdown tables (all rows on one line separated
 * by `| |`) and split them into proper multi-line tables so remarkGfm can parse
 * them.  Also inserts a separator row (`| --- | --- |`) after the header when
 * one is missing.
 */
function fixCollapsedTables(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('|')) return line
      const collapseCount = (trimmed.match(/\| \|/g) || []).length
      if (collapseCount < 2) return line

      // Split collapsed rows
      const rows = trimmed.replace(/\| \|/g, '|\n|').split('\n')

      // Insert separator row after header if missing
      if (rows.length >= 2 && !rows[1].includes('---')) {
        const colCount = (rows[0].match(/\|/g) || []).length - 1
        if (colCount > 0) {
          const sep = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
          rows.splice(1, 0, sep)
        }
      }
      return rows.join('\n')
    })
    .join('\n')
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose-bl ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{fixCollapsedTables(content)}</ReactMarkdown>
    </div>
  )
}
