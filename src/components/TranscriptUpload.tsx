import { useState, useRef } from 'react'

interface TranscriptInfo {
  filename: string
  uploaded_at: string
  file_size?: number
  google_doc_url?: string
}

interface Props {
  existing?: TranscriptInfo | null
  uploading?: boolean
  onUpload: (file: File) => Promise<void>
  onGDocImport?: (gdocUrl: string) => Promise<void>
  onDownload?: () => void
  accept?: string
}

export default function TranscriptUpload({
  existing,
  uploading = false,
  onUpload,
  onGDocImport,
  onDownload,
  accept = '.docx,.doc,.pdf,.txt,.md,.rtf',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'file' | 'gdoc'>('file')
  const [gdocUrl, setGdocUrl] = useState('')
  const [gdocSubmitting, setGdocSubmitting] = useState(false)

  async function handleFile(file: File) {
    setError('')
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    const allowed = new Set(accept.split(',').map(s => s.trim()))
    if (!allowed.has(ext)) {
      setError(`File type ${ext} not allowed.`)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File exceeds 50 MB limit.')
      return
    }
    try {
      await onUpload(file)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    }
  }

  async function handleGDocSubmit() {
    setError('')
    const url = gdocUrl.trim()
    if (!url.startsWith('https://docs.google.com/document/d/')) {
      setError('Please enter a valid Google Docs URL.')
      return
    }
    if (!onGDocImport) return
    setGdocSubmitting(true)
    try {
      await onGDocImport(url)
      setGdocUrl('')
    } catch (e: any) {
      setError(e?.message || 'Import failed')
    } finally {
      setGdocSubmitting(false)
    }
  }

  function formatSize(bytes?: number) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Uploading / importing state
  if (uploading || gdocSubmitting) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-warm py-1">
        <svg className="w-4 h-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {gdocSubmitting ? 'Importing from Google Doc...' : 'Uploading...'}
      </div>
    )
  }

  // Uploaded state
  if (existing) {
    return (
      <div>
        <div className="flex items-center gap-2">
          {existing.google_doc_url ? (
            <svg className="w-4 h-4 text-teal flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
              <path d="M8 13h8v1.5H8zm0 3h6v1.5H8z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          )}
          <div className="flex-1 min-w-0">
            {onDownload && !existing.google_doc_url ? (
              <button
                onClick={onDownload}
                className="text-xs text-teal hover:underline truncate block max-w-full text-left"
              >
                {existing.filename}
              </button>
            ) : existing.google_doc_url ? (
              <a
                href={existing.google_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-teal hover:underline truncate block max-w-full text-left"
              >
                {existing.filename}
              </a>
            ) : (
              <span className="text-xs text-charcoal truncate block">{existing.filename}</span>
            )}
            <span className="text-[10px] text-gray-warm">
              {new Date(existing.uploaded_at).toLocaleDateString()}
              {existing.file_size ? ` · ${formatSize(existing.file_size)}` : ''}
              {existing.google_doc_url ? ' · Imported from Google Doc' : ''}
            </span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[10px] text-gray-warm hover:text-charcoal px-1.5 py-0.5 rounded border border-gray-light hover:border-charcoal/30 transition-colors flex-shrink-0"
          >
            Replace
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        {error && <p className="text-xs text-red-soft mt-1">{error}</p>}
      </div>
    )
  }

  // Empty state — mode toggle
  return (
    <div>
      {onGDocImport && (
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => { setMode('file'); setError('') }}
            className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
              mode === 'file'
                ? 'bg-teal/10 text-teal font-medium'
                : 'text-gray-warm hover:text-charcoal'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => { setMode('gdoc'); setError('') }}
            className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
              mode === 'gdoc'
                ? 'bg-teal/10 text-teal font-medium'
                : 'text-gray-warm hover:text-charcoal'
            }`}
          >
            Google Doc URL
          </button>
        </div>
      )}

      {mode === 'file' ? (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-gray-warm hover:text-teal inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Transcript
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="url"
              value={gdocUrl}
              onChange={e => setGdocUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleGDocSubmit() }}
              placeholder="https://docs.google.com/document/d/..."
              className="flex-1 text-xs px-2 py-1.5 border border-gray-light rounded-md focus:outline-none focus:border-teal/50 placeholder:text-gray-warm/50"
            />
            <button
              onClick={handleGDocSubmit}
              disabled={!gdocUrl.trim()}
              className="text-xs px-2.5 py-1.5 bg-teal text-white rounded-md hover:bg-teal/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              Import
            </button>
          </div>
          <p className="text-[10px] text-gray-warm leading-tight">
            Paste any Google Doc URL. The doc must be accessible to view (Anyone with link).
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-soft mt-1">{error}</p>}
    </div>
  )
}
