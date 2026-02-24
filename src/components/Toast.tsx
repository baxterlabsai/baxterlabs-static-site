import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (text: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const toast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++nextId
    setMessages(prev => [...prev, { id, text, type }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {messages.map(m => (
          <ToastItem key={m.id} message={m} onDismiss={() => dismiss(m.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const colors = {
    success: 'bg-teal text-white',
    error: 'bg-crimson text-white',
    info: 'bg-charcoal text-white',
  }

  return (
    <div
      className={`${colors[message.type]} px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto animate-slide-in flex items-start gap-2`}
    >
      <span className="flex-1">{message.text}</span>
      <button onClick={onDismiss} className="text-white/70 hover:text-white flex-shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
