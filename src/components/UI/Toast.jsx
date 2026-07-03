import React, { useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'

// Single toast entry
function ToastItem({ toast, onUndo, onDismiss }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 glass card-shadow rounded-xl min-w-[260px] max-w-[360px] animate-in slide-in-from-bottom-2 duration-200">
      <span className="text-sm text-th-text2 flex-1">{toast.message}</span>
      {toast.onUndo && (
        <button
          onClick={() => { toast.onUndo(); onDismiss(toast.id) }}
          className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors shrink-0"
        >
          Undo
        </button>
      )}
      <button onClick={() => onDismiss(toast.id)} className="text-th-text5 hover:text-th-text3 transition-colors shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

// Hook — call useToast() anywhere to get { showToast }
let _addToast = null
export function useToast() {
  const showToast = useCallback((message, { onUndo, duration = 5000 } = {}) => {
    _addToast?.({ message, onUndo, duration })
  }, [])
  return { showToast }
}

// Mount once in App root
export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  _addToast = useCallback(({ message, onUndo, duration }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, onUndo }])
    timers.current[id] = setTimeout(() => {
      // Auto-commit: if there was an onUndo pending action, it was already queued by the caller
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onUndo={() => {}} onDismiss={dismiss} />)}
    </div>
  )
}
