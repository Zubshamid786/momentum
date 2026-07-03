import React, { useState } from 'react'
import { Square, Clock, Sun, Moon, Maximize2, Search, Keyboard, Pause, Play, Brain, Layers, FileText, Smartphone, Menu } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDurationLong } from '../../utils/formatTime'
import NotificationBell from '../Notifications/NotificationBell'
import MobileAccessModal from '../Mobile/MobileAccessModal'

const WORK_TYPES = [
  { key: 'deep',    label: 'Deep',    icon: Brain,    color: 'text-indigo-400 bg-indigo-500/20' },
  { key: 'shallow', label: 'Shallow', icon: Layers,   color: 'text-sky-400 bg-sky-500/20' },
  { key: 'admin',   label: 'Admin',   icon: FileText, color: 'text-slate-400 bg-slate-500/20' },
]

function WorkTypeToggle({ timerId, currentType }) {
  const [type, setType] = useState(currentType || 'deep')
  const [open, setOpen]  = useState(false)

  async function select(t) {
    setType(t)
    setOpen(false)
    await window.api.updateTimeEntry(timerId, { work_type: t })
  }

  const current = WORK_TYPES.find(w => w.key === type) || WORK_TYPES[0]
  const Icon = current.icon

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${current.color}`}
        title="Work type"
      >
        <Icon size={11} />
        {current.label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-th-surface border border-th-border rounded-xl shadow-xl z-50 py-1 min-w-[110px]">
          {WORK_TYPES.map(w => {
            const WIcon = w.icon
            return (
              <button key={w.key} onClick={() => select(w.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-th-raised transition-colors ${w.key === type ? 'text-th-text1 font-medium' : 'text-th-text3'}`}>
                <WIcon size={12} className={w.color.split(' ')[0]} />
                {w.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TopBar({ onOpenFocus, onOpenSearch, onOpenShortcuts, onOpenTask, onOpenSidebar }) {
  const { state, stopTimer, pauseTimer, resumeTimer, dispatch } = useApp()
  const { activeTimer, timerSeconds, timerPaused, pausedTask, currentView, currentProject, theme } = state
  const [showMobile, setShowMobile] = useState(false)

  function getTitle() {
    if (currentView === 'dashboard') return 'Dashboard'
    if (currentView === 'reports')  return 'Reports'
    if (currentView === 'calendar') return 'Calendar'
    if (currentView === 'journal')  return 'Journal'
    if (currentView === 'projects') return 'All Projects'
    if (currentView === 'project' && currentProject) return currentProject.name
    return 'FlowTrack'
  }

  return (
    <header className="flex items-center justify-between px-3 md:px-6 h-14 shrink-0 bg-th-surface/90 border-b border-th-border/60 backdrop-blur-sm relative z-[200]" style={{ boxShadow: '0 1px 0 rgb(var(--th-border)/0.5)' }}>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors mr-1"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        {currentView === 'project' && currentProject && (
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentProject.color }} />
        )}
        <h1 className="text-base font-semibold text-th-text1">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search shortcut */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-th-raised/80 border border-th-border/50 rounded-lg text-xs text-th-text4 hover:text-th-text2 hover:border-th-border transition-colors"
          title="Search (⌘K)"
        >
          <Search size={13} />
          <span>Search</span>
          <kbd className="ml-1 text-xs text-th-text5">⌘K</kbd>
        </button>

        {(activeTimer || timerPaused) ? (
          <div className={`flex items-center gap-1.5 md:gap-2 border rounded-xl px-2 md:px-3 py-2 transition-colors ${
            timerPaused ? 'bg-th-raised border-th-border/80' : 'bg-th-card border-th-border'
          }`}>
            <button
              onClick={() => {
                const taskId = timerPaused ? pausedTask?.id : activeTimer?.task_id
                if (taskId) onOpenTask?.({ taskId, projectId: timerPaused ? pausedTask?.project_id : activeTimer?.project_id, projectColor: timerPaused ? pausedTask?.project_color : activeTimer?.project_color })
              }}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              title="View task"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${timerPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
              <p className="hidden sm:block text-xs text-th-text3 truncate max-w-[120px] md:max-w-[180px]"
                title={timerPaused
                  ? `${pausedTask?.project_name} · ${pausedTask?.task_title}`
                  : `${activeTimer.project_name} · ${activeTimer.task_title}`}>
                {timerPaused
                  ? `${pausedTask?.project_name} · ${pausedTask?.task_title}`
                  : `${activeTimer.project_name} · ${activeTimer.task_title}`}
              </p>
            </button>
            <span className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${timerPaused ? 'text-yellow-400' : 'text-th-text1'}`}>
              {formatDurationLong(timerSeconds)}
            </span>

            {/* Work-type toggle — desktop only */}
            {activeTimer && !timerPaused && (
              <span className="hidden md:block">
                <WorkTypeToggle timerId={activeTimer.id} currentType={activeTimer.work_type || 'deep'} />
              </span>
            )}

            {/* Focus mode */}
            {!timerPaused && (
              <button
                onClick={onOpenFocus}
                className="p-1.5 rounded-lg text-th-text4 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                title="Focus mode (F)"
              >
                <Maximize2 size={13} />
              </button>
            )}

            {timerPaused ? (
              <button
                onClick={resumeTimer}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-colors"
              >
                <Play size={12} fill="currentColor" />
                <span className="hidden sm:inline">Resume</span>
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="p-1.5 rounded-lg text-th-text4 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                title="Pause timer"
              >
                <Pause size={13} />
              </button>
            )}
            <button
              onClick={stopTimer}
              className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
            >
              <Square size={12} fill="currentColor" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-th-text4 text-sm">
            <Clock size={14} />
            <span>No active timer</span>
          </div>
        )}

        <NotificationBell onOpenTask={onOpenTask} />

        <button
          onClick={onOpenShortcuts}
          className="hidden md:block p-2 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={17} />
        </button>

        <button
          onClick={() => setShowMobile(true)}
          className="hidden md:block p-2 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
          title="Open on mobile"
        >
          <Smartphone size={17} />
        </button>

        <button
          onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          className="p-2 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {showMobile && <MobileAccessModal onClose={() => setShowMobile(false)} />}
    </header>
  )
}
