import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard, FolderKanban, BarChart3, CalendarDays, Sun, Moon,
  Plus, ChevronRight, Archive, Zap, ListTodo, AlertCircle, ClipboardList, Settings, NotebookPen, Target, Inbox, X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import CreateProjectModal from '../Projects/CreateProjectModal'
import WeeklyReview from '../Reports/WeeklyReview'

function isOverdueDate(due_date) {
  if (!due_date) return false
  return due_date < new Date().toISOString().split('T')[0]
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inbox',     label: 'Inbox',     icon: Inbox, badge: true },
  { id: 'projects',  label: 'Projects',  icon: FolderKanban },
  { id: 'goals',     label: 'Goals',     icon: Target },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarDays },
  { id: 'reports',   label: 'Reports',   icon: BarChart3 },
  { id: 'journal',   label: 'Journal',   icon: NotebookPen },
  { id: 'settings',  label: 'Settings',  icon: Settings },
]

export default function Sidebar({ isOpen, onClose }) {
  const { state, dispatch, loadProjects } = useApp()
  const { currentView, currentProject, projects, theme } = state
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showArchived, setShowArchived]   = useState(false)
  const [showTasks, setShowTasks]         = useState(true)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)
  const [taskSummary, setTaskSummary]     = useState([])
  const [inboxCount, setInboxCount]       = useState(0)

  useEffect(() => {
    window.api.getTasksSummary().then(data => setTaskSummary(data || []))
    window.api.getInboxTasks().then(tasks => setInboxCount((tasks || []).length))
  }, [currentView, currentProject])  // refresh when view changes

  const activeProjects = projects.filter(p => p.status === 'active')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  function handleNavClick(viewId) {
    dispatch({ type: 'SET_VIEW', payload: viewId })
    onClose?.()
  }

  function handleProjectClick(project) {
    dispatch({ type: 'SET_PROJECT', payload: project })
    onClose?.()
  }

  function isProjectActive(project) {
    return currentView === 'project' && currentProject?.id === project.id
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[280] md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`
        fixed inset-y-0 left-0 z-[290] md:relative md:inset-auto md:z-auto
        flex flex-col w-64 shrink-0 bg-th-surface border-r border-th-border h-full
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-th-border">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-th-text1 text-base tracking-tight">Momentum</span>
          <button
            onClick={onClose}
            className="md:hidden ml-auto p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="px-3 pt-4 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                (currentView === id || (id === 'projects' && currentView === 'project'))
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-th-text3 hover:text-th-text1 hover:bg-th-raised'
              }`}
            >
              <Icon size={17} />
              <span className="flex-1 text-left">{label}</span>
              {badge && inboxCount > 0 && (
                <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 min-w-[18px] text-center">
                  {inboxCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Projects + Tasks Section — single scrollable region keeps footer always visible */}
        <div className="flex-1 overflow-y-auto px-3 mt-6 pb-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Projects</span>
            <button
              onClick={() => setShowCreateProject(true)}
              className="p-1 rounded text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
              title="New Project"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-0.5">
            {activeProjects.map(project => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group ${
                  isProjectActive(project)
                    ? 'bg-th-raised text-th-text1'
                    : 'text-th-text3 hover:text-th-text1 hover:bg-th-raised'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                <span className="truncate flex-1 text-left">{project.name}</span>
                <span className="text-xs text-th-text5 group-hover:text-th-text4 shrink-0">
                  {project.task_count}
                </span>
              </button>
            ))}

            {activeProjects.length === 0 && (
              <p className="px-3 py-2 text-xs text-th-text5">No active projects</p>
            )}
          </div>

          {archivedProjects.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowArchived(v => !v)}
                className="flex items-center gap-1.5 px-3 mb-1.5 text-xs font-semibold text-th-text5 hover:text-th-text3 transition-colors"
              >
                <Archive size={12} />
                Archived
                <ChevronRight size={12} className={`transition-transform ${showArchived ? 'rotate-90' : ''}`} />
              </button>
              {showArchived && archivedProjects.map(project => (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-th-text5 hover:text-th-text3 hover:bg-th-raised transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 opacity-50" style={{ backgroundColor: project.color }} />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tasks Section — inside scroll area so footer is never pushed off screen */}
          {taskSummary.length > 0 && (
            <div className="mt-4 border-t border-th-border pt-4">
              <button
                onClick={() => setShowTasks(v => !v)}
                className="flex items-center justify-between w-full px-3 mb-2"
              >
                <div className="flex items-center gap-1.5">
                  <ListTodo size={12} className="text-th-text4" />
                  <span className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Tasks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-th-text5">{taskSummary.length}</span>
                  <ChevronRight size={12} className={`text-th-text5 transition-transform ${showTasks ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {showTasks && (
                <div className="space-y-0.5">
                  {taskSummary.map(task => {
                    const overdue = isOverdueDate(task.due_date)
                    const project = activeProjects.find(p => p.id === task.project_id)
                    return (
                      <button
                        key={task.id}
                        onClick={() => project && handleProjectClick(project)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-th-text3 hover:text-th-text1 hover:bg-th-raised transition-colors group"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
                        {task.icon
                          ? <span className="text-sm leading-none shrink-0">{task.icon}</span>
                          : null
                        }
                        <span className="truncate flex-1 text-left">{task.title}</span>
                        {overdue && <AlertCircle size={10} className="text-red-400 shrink-0" />}
                        {task.due_date && !overdue && (
                          <span className={`text-th-text5 shrink-0 font-mono ${task.due_date === new Date().toISOString().split('T')[0] ? 'text-yellow-400' : ''}`}>
                            {task.due_date.slice(5)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-th-border space-y-0.5">
          <button
            onClick={() => setShowWeeklyReview(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-th-text3 hover:text-th-text1 hover:bg-th-raised transition-colors"
          >
            <ClipboardList size={17} />
            Weekly Review
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-th-text3 hover:text-th-text1 hover:bg-th-raised transition-colors"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={() => { loadProjects(); setShowCreateProject(false) }}
      />

      {showWeeklyReview && <WeeklyReview onClose={() => setShowWeeklyReview(false)} />}
    </>
  )
}
