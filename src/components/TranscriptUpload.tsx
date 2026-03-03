import { useState, useRef } from 'react'

interface TranscriptInfo {
  filename: string
  uploaded_at: string
  file_size?: number
}

interface Props {
  existing?: TranscriptInfo | null
  uploading?: boolean
  onUpload: (file: File) => Promise<void>
  onDownload?: () => void
  accept?: string
}

export default function TranscriptUpload({
  existing,
  uploading = false,
  onUpload,
  onDownload,
  accept = '.docx,.doc,.pdf,.txt,.md,.rtf',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

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

  function formatSize(bytes?: number) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Uploading state
  if (uploading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-warm py-1">
        <svg className="w-4 h-4 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Uploading...
      </div>
    )
  }

  // Uploaded state
  if (existing) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="flex-1 min-w-0">
            {onDownload ? (
              <button
                onClick={onDownload}
                className="text-xs text-teal hover:underline truncate block max-w-full text-left"
              >
                {existing.filename}
              </button>
            ) : (
              <span className="text-xs text-charcoal truncate block">{existing.filename}</span>
            )}
            <span className="text-[10px] text-gray-warm">
              {new Date(existing.uploaded_at).toLocaleDateString()}
              {existing.file_size ? ` · ${formatSize(existing.file_size)}` : ''}
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

  // Empty state
  return (
    <div>
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
      {error && <p className="text-xs text-red-soft mt-1">{error}</p>}
    </div>
  )
}
