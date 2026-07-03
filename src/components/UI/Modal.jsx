import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-th-surface rounded-t-2xl sm:rounded-xl border border-th-border shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh]`}>
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-th-border shrink-0">
          <h2 className="text-base md:text-lg font-semibold text-th-text1">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-th-text3 hover:text-th-text1 hover:bg-th-raised transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
