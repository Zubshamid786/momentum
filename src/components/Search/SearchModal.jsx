import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FolderKanban, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const STATUS_DOT = {
  todo: 'bg-th-text4', in_progress: 'bg-blue-400',
  blocked: 'bg-red-400', done: 'bg-green-400',
}
const PRIORITY_COLOR = {
  urgent: 'text-red-400', high: 'text-orange-400',
  medium: 'text-yellow-400', low: 'text-th-text5',
}

export default function SearchModal({ onClose }) {
  const { dispatch } = useApp()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState({ tasks: [], projects: [] })
  const [active, setActive]   = useState(0)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults({ tasks: [], projects: [] }); setActive(0); return }
    const t = setTimeout(async () => {
      const data = await window.api.searchAll(query.trim())
      setResults(data || { tasks: [], projects: [] })
      setActive(0)
    }, 120)
    return () => clearTimeout(t)
  }, [query])

  const allItems = [
    ...results.projects.map(p => ({ type: 'project', ...p })),
    ...results.tasks.map(t => ({ type: 'task', ...t })),
  ]

  function select(item) {
    if (item.type === 'project') {
      dispatch({ type: 'SET_PROJECT', payload: item })
    } else {
      const project = { id: item.project_id, name: item.project_name, color: item.project_color }
      dispatch({ type: 'SET_PROJECT', payload: project })
    }
    onClose()
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && allItems[active]) select(allItems[active])
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    const el = listRef.current?.children[active]
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const hasTasks    = results.tasks.length > 0
  const hasProjects = results.projects.length > 0
  const empty       = query.trim() && !hasTasks && !hasProjects

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-24 bg-black/50 sm:bg-transparent" onClick={onClose}>
      <div
        className="w-full sm:max-w-xl bg-th-surface border border-th-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-th-border">
          <Search size={17} className="text-th-text4 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search tasks and projects..."
            className="flex-1 bg-transparent text-sm text-th-text1 placeholder-th-text5 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-th-text5 hover:text-th-text3 transition-colors">
              <X size={15} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-xs text-th-text5 bg-th-raised border border-th-border rounded">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 'min(420px, 55dvh)' }}>
          {!query.trim() && (
            <p className="px-4 py-8 text-center text-sm text-th-text5">Type to search tasks and projects</p>
          )}

          {empty && (
            <p className="px-4 py-8 text-center text-sm text-th-text5">No results for "{query}"</p>
          )}

          {hasProjects && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-th-text5 uppercase tracking-wider">Projects</p>
              {results.projects.map((proj, i) => {
                const idx = i
                return (
                  <button
                    key={proj.id}
                    onClick={() => select({ type: 'project', ...proj })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active === idx ? 'bg-th-raised' : 'hover:bg-th-raised/50'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: proj.color + '30' }}>
                      <FolderKanban size={13} style={{ color: proj.color }} />
                    </div>
                    <span className="text-sm text-th-text1 flex-1 truncate">{proj.name}</span>
                    <span className="text-xs text-th-text5">{proj.task_count} tasks</span>
                  </button>
                )
              })}
            </div>
          )}

          {hasTasks && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-th-text5 uppercase tracking-wider">Tasks</p>
              {results.tasks.map((task, i) => {
                const idx = results.projects.length + i
                return (
                  <button
                    key={task.id}
                    onClick={() => select({ type: 'task', ...task })}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active === idx ? 'bg-th-raised' : 'hover:bg-th-raised/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[task.status]}`} />
                    </div>
                    {task.icon && <span className="text-base leading-none shrink-0">{task.icon}</span>}
                    <span className="text-sm text-th-text1 flex-1 truncate">{task.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-th-text5 truncate max-w-[100px]">{task.project_name}</span>
                      <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Keyboard hint */}
          {allItems.length > 0 && (
            <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-th-border/50">
              <span className="text-xs text-th-text5 flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-th-raised border border-th-border rounded text-xs">↑↓</kbd> navigate
              </span>
              <span className="text-xs text-th-text5 flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-th-raised border border-th-border rounded text-xs">↵</kbd> open
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
