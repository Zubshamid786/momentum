import React, { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

const SHORTCUTS = [
  {
    group: 'Navigation',
    items: [
      { keys: ['⌘', 'K'],  label: 'Global search' },
      { keys: ['F'],        label: 'Focus mode' },
      { keys: ['?'],        label: 'Show shortcuts' },
      { keys: ['Esc'],      label: 'Close modal / exit overlay' },
    ],
  },
  {
    group: 'Timer',
    items: [
      { keys: ['▶'],        label: 'Start timer on a task (click Track)' },
      { keys: ['■'],        label: 'Stop active timer' },
      { keys: ['F'],        label: 'Enter focus / Pomodoro mode' },
    ],
  },
  {
    group: 'Task Panel',
    items: [
      { keys: ['Enter'],    label: 'Save title or description edit' },
      { keys: ['Esc'],      label: 'Cancel edit' },
      { keys: ['↑', '↓'],  label: 'Navigate search results' },
    ],
  },
  {
    group: 'Calendar',
    items: [
      { keys: ['←'],        label: 'Previous period' },
      { keys: ['→'],        label: 'Next period' },
    ],
  },
]

function Key({ k }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded-md text-xs font-semibold text-th-text2 bg-th-raised border border-th-border shadow-sm">
      {k}
    </kbd>
  )
}

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' || e.key === '?') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-th-surface border border-th-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-th-border">
          <div className="flex items-center gap-2.5">
            <Keyboard size={17} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-th-text1">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6">
          {SHORTCUTS.map(group => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-th-text5 uppercase tracking-wider mb-3">{group.group}</p>
              <div className="space-y-2.5">
                {group.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-th-text3">{item.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, j) => <Key key={j} k={k} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-th-text5">Press <Key k="?" /> again or <Key k="Esc" /> to close</p>
        </div>
      </div>
    </div>
  )
}
