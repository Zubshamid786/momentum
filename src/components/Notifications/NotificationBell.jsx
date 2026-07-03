import React, { useState, useRef, useEffect } from 'react'
import { Bell, Calendar, AlertCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDateShort } from '../../utils/formatTime'

const PRIORITY_COLOR = { urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-th-text4' }

export default function NotificationBell({ onOpenTask }) {
  const { state, dispatch } = useApp()
  const { overdueTasks, projects } = state
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleTaskClick(task) {
    setOpen(false)
    // Navigate to the project first
    const project = (projects || []).find(p => p.id === task.project_id)
    if (project) {
      dispatch({ type: 'SET_PROJECT', payload: project })
    }
    // Then open the task detail
    if (onOpenTask) {
      onOpenTask({ taskId: task.id, projectId: task.project_id, projectColor: task.project_color })
    }
  }

  const count = overdueTasks?.length || 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`relative p-2 rounded-lg transition-colors ${open ? 'bg-th-raised text-th-text1' : 'text-th-text4 hover:text-th-text2 hover:bg-th-raised'}`}
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-0.5">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] bg-th-surface border border-th-border rounded-xl shadow-2xl z-[300] overflow-hidden">
          <div className="px-4 py-3 border-b border-th-border flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span className="text-sm font-semibold text-th-text1">
              {count > 0 ? `${count} Overdue Task${count > 1 ? 's' : ''}` : 'No overdue tasks'}
            </span>
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-th-text5">
              You're all caught up!
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-th-border/50">
              {overdueTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="w-full text-left px-4 py-3 hover:bg-th-raised/60 active:bg-th-raised transition-colors"
                >
                  <p className={`text-xs font-semibold mb-1 ${PRIORITY_COLOR[task.priority]}`}>
                    {task.priority.toUpperCase()} · {task.project_name}
                  </p>
                  <p className="text-sm text-th-text2 leading-snug">{task.title}</p>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-red-400">
                    <Calendar size={11} />
                    <span>Due {formatDateShort(task.due_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
