import React, { useState, useEffect } from 'react'
import { Plus, Clock, CheckCircle2, MoreVertical, Archive, Trash2, Pencil, FolderKanban } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDuration } from '../../utils/formatTime'
import CreateProjectModal from './CreateProjectModal'
import EditProjectModal from './EditProjectModal'

const FILTERS = ['all', 'active', 'archived']

export default function ProjectsView() {
  const { state, dispatch, loadProjects } = useApp()
  const { projects } = state
  const [filter, setFilter] = useState('all')

  // Always reload on mount so navigating here never shows stale/empty data
  useEffect(() => { loadProjects() }, [])
  const [showCreate, setShowCreate] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  const filtered = (projects || []).filter(p => filter === 'all' || p.status === filter)

  async function handleArchive(project) {
    await window.api.updateProject(project.id, { status: project.status === 'active' ? 'archived' : 'active' })
    loadProjects()
    setMenuOpen(null)
  }

  async function handleDelete(project) {
    if (!confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return
    await window.api.deleteProject(project.id)
    loadProjects()
    setMenuOpen(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-th-card border border-th-border rounded-lg p-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-th-raised text-th-text1' : 'text-th-text4 hover:text-th-text2'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Project
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-th-text5">
          <FolderKanban size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1 text-th-text3">No projects yet</p>
          <p className="text-sm">Create your first project to get started</p>
          <button onClick={() => setShowCreate(true)} className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(project => {
            const pct = project.task_count > 0 ? Math.round((project.completed_tasks / project.task_count) * 100) : 0
            return (
              <div key={project.id} className="relative glass-card card-shadow rounded-xl p-5 hover:border-th-border/80 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-200 cursor-pointer group"
                onClick={() => dispatch({ type: 'SET_PROJECT', payload: project })}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: project.color }} />

                <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    className="p-1.5 rounded-lg text-th-text5 hover:text-th-text2 hover:bg-th-raised transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical size={15} />
                  </button>
                  {menuOpen === project.id && (
                    <div className="absolute right-0 top-8 w-44 bg-th-surface border border-th-border rounded-xl shadow-xl z-10 py-1">
                      <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-th-text2 hover:bg-th-raised transition-colors"
                        onClick={() => { setEditProject(project); setMenuOpen(null) }}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-th-text2 hover:bg-th-raised transition-colors"
                        onClick={() => handleArchive(project)}>
                        <Archive size={14} /> {project.status === 'active' ? 'Archive' : 'Unarchive'}
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                        onClick={() => handleDelete(project)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                    <h3 className="font-semibold text-th-text1 truncate">{project.name}</h3>
                  </div>
                  {project.description && <p className="text-sm text-th-text4 line-clamp-2">{project.description}</p>}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-th-text4 mb-1.5">
                    <span>{project.completed_tasks}/{project.task_count} tasks</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-th-raised rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-th-text4">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={13} />{project.task_count} tasks</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} />{formatDuration(project.total_time)} total</span>
                  {project.today_time > 0 && <span className="text-brand-400">+{formatDuration(project.today_time)} today</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { loadProjects(); setShowCreate(false) }} />
      {editProject && <EditProjectModal isOpen={!!editProject} project={editProject} onClose={() => setEditProject(null)} onUpdated={() => { loadProjects(); setEditProject(null) }} />}
    </div>
  )
}
