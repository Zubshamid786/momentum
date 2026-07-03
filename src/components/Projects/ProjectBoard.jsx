import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Play, Square, Calendar, MessageSquare, MoreVertical, Trash2, Pencil, ChevronLeft, GripVertical, Clock, BookTemplate, Check, Tag, GitBranch, Kanban, Timer, AlertTriangle } from 'lucide-react'
import ProjectDiagram from './ProjectDiagram'
import MountainView from './MountainView'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useApp } from '../../context/AppContext'
import { useToast } from '../UI/Toast'
import { formatDuration, formatDateShort, isOverdue, isDueToday } from '../../utils/formatTime'
import CreateTaskModal from './CreateTaskModal'
import TaskDetail from './TaskDetail'

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: 'text-th-text3', dot: 'bg-th-text4' },
  { id: 'in_progress', label: 'In Progress',  color: 'text-blue-400',  dot: 'bg-blue-500' },
  { id: 'blocked',     label: 'Blocked',      color: 'text-red-400',   dot: 'bg-red-500' },
  { id: 'done',        label: 'Done',         color: 'text-green-400', dot: 'bg-green-500' },
]

const PRIORITY_BADGE = {
  urgent: 'bg-red-400/15 text-red-400',
  high:   'bg-orange-400/15 text-orange-400',
  medium: 'bg-yellow-400/15 text-yellow-400',
  low:    'bg-th-raised text-th-text4',
}

function DeadlineBadge({ dueDate, dueTime, notifyBefore }) {
  const [minutesLeft, setMinutesLeft] = useState(null)
  useEffect(() => {
    if (!dueDate || !dueTime) return
    function calc() {
      const mins = (new Date(`${dueDate}T${dueTime}`).getTime() - Date.now()) / 60000
      setMinutesLeft(Math.ceil(mins))
    }
    calc()
    const id = setInterval(calc, 30000)
    return () => clearInterval(id)
  }, [dueDate, dueTime])
  if (minutesLeft === null) return null
  const threshold = notifyBefore || 10
  if (minutesLeft > threshold || minutesLeft < 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full animate-pulse">
      <Clock size={9} />{minutesLeft <= 0 ? 'Now!' : `${minutesLeft}m`}
    </span>
  )
}

function isStale(updatedAt, status) {
  if (!updatedAt || status === 'done') return false
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / 86400000
  return daysSince >= 21
}

function DraggableCard({ task, isSelected, isRunning, onSelect, onTimer, onPomodoro, onDelete, onEdit, onStatusChange }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const overdue  = isOverdue(task.due_date)
  const dueToday = isDueToday(task.due_date)
  const stale    = isStale(task.updated_at, task.status)
  const [menu, setMenu] = useState(false)

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onSelect(task)}
      className={`relative glass-card card-shadow rounded-xl p-4 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)] ${
        isSelected ? 'border-brand-500/50 shadow-[0_0_0_1px_rgba(99,102,241,0.3),0_4px_24px_rgba(0,0,0,0.35)]' : 'hover:border-th-border/80'
      } ${isRunning ? 'ring-1 ring-green-500/40' : ''}`}
    >
      {/* Drag handle */}
      <div {...listeners} {...attributes}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-th-text5 touch-none"
        onClick={e => e.stopPropagation()}>
        <GripVertical size={14} />
      </div>

      {isRunning && <span className="absolute top-3 right-10 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}

      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => { e.stopPropagation(); setMenu(v => !v) }}>
        <button className="p-1 rounded text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors">
          <MoreVertical size={14} />
        </button>
        {menu && (
          <div className="absolute right-0 top-7 w-44 bg-th-surface border border-th-border rounded-xl shadow-xl z-20 py-1"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { onEdit(task); setMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-th-text2 hover:bg-th-raised">
              <Pencil size={13} /> Edit
            </button>
            {COLUMNS.filter(c => c.id !== task.status).map(c => (
              <button key={c.id} onClick={() => { onStatusChange(task, c.id); setMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-th-text2 hover:bg-th-raised">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> Move to {c.label}
              </button>
            ))}
            <div className="h-px bg-th-border my-1" />
            <button onClick={() => { onDelete(task); setMenu(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Priority + stale badges row */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        <DeadlineBadge dueDate={task.due_date} dueTime={task.due_time} notifyBefore={task.notify_before} />
        {stale && (
          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25" title="No activity in 21+ days">
            <AlertTriangle size={9} /> Stale
          </span>
        )}
      </div>

      {/* Title row — consistent left padding */}
      <div className="flex items-start gap-2 mb-3 pl-3 pr-6">
        {task.icon && <span className="text-base leading-tight shrink-0 mt-0.5">{task.icon}</span>}
        <p className="text-sm font-medium text-th-text1 leading-snug">{task.title}</p>
      </div>

      {/* Progress bar — shown only when estimate is set */}
      {task.estimate > 0 && (
        <div className="pl-3 pr-3 mb-2.5">
          <div className="h-1.5 bg-th-raised rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${(task.total_time || 0) > task.estimate ? 'bg-red-400' : 'bg-brand-500'}`}
              style={{ width: `${Math.min((task.total_time || 0) / task.estimate * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-th-text5 mt-1">
            <span>{formatDuration(task.total_time || 0)}</span>
            <span>{formatDuration(task.estimate)}</span>
          </div>
        </div>
      )}

      {/* Metadata row — consistent padding, no duplicate time when estimate shown */}
      <div className="flex items-center justify-between pl-3 pr-1">
        <div className="flex items-center gap-2.5 text-xs text-th-text5 overflow-hidden">
          {/* Only show time here when there's no estimate (no progress bar) */}
          {!task.estimate && (
            <span className="flex items-center gap-1 shrink-0">
              <Play size={10} />{formatDuration(task.total_time || 0)}
            </span>
          )}
          {task.subtask_count > 0 && (
            <span className={`flex items-center gap-1 shrink-0 ${task.subtask_done === task.subtask_count ? 'text-green-400' : ''}`}>
              ✓ {task.subtask_done}/{task.subtask_count}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 shrink-0">
              <MessageSquare size={10} />{task.comment_count}
            </span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 shrink-0 ${overdue ? 'text-red-400' : dueToday ? 'text-yellow-400' : ''}`}>
              <Calendar size={10} />{formatDateShort(task.due_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onPomodoro(task) }}
            className="p-1.5 rounded-lg transition-colors text-th-text4 hover:bg-brand-500/20 hover:text-brand-400"
            title="Start Pomodoro">
            <Timer size={12} />
          </button>
          <button onClick={e => { e.stopPropagation(); onTimer(e, task) }}
            className={`p-1.5 rounded-lg transition-colors ${
              isRunning ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400' : 'text-th-text3 hover:bg-brand-500/20 hover:text-brand-400'
            }`}>
            {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function ColumnDropZone({ col, tasks, selectedTask, activeTimer, onSelect, onTimer, onPomodoro, onDelete, onEdit, onStatusChange, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
          <span className="text-xs text-th-text5 bg-th-raised px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button onClick={() => onAddTask(col.id)} className="p-1 rounded text-th-text5 hover:text-th-text2 hover:bg-th-raised transition-colors">
          <Plus size={14} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-[60px] rounded-xl p-1 -m-1 transition-colors ${
          isOver ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : ''
        }`}
      >
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            isSelected={selectedTask?.id === task.id}
            isRunning={activeTimer?.task_id === task.id}
            onSelect={onSelect}
            onTimer={onTimer}
            onPomodoro={onPomodoro}
            onDelete={onDelete}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}

        <button onClick={() => onAddTask(col.id)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-th-border text-th-text5 hover:text-th-text3 hover:border-th-border text-sm transition-colors">
          <Plus size={14} /> Add task
        </button>
      </div>
    </div>
  )
}

export default function ProjectBoard({ onOpenFocusPomodoro, pendingTaskId, onPendingTaskConsumed }) {
  const { state, dispatch, startTimer, stopTimer, loadProjects } = useApp()
  const { currentProject, activeTimer } = state
  const { showToast } = useToast()
  const [tasks, setTasks]               = useState([])
  const [createStatus, setCreateStatus] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [activeId, setActiveId]         = useState(null)
  const [savedTemplate, setSavedTemplate] = useState(false)
  const [boardView, setBoardView]       = useState('kanban') // 'kanban' | 'diagram'
  const [allTags, setAllTags]           = useState([])
  const [activeTags, setActiveTags]     = useState([])  // tag ids to filter by
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [taskTagMap, setTaskTagMap]     = useState({})   // taskId → [tagId]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadTasks = useCallback(async () => {
    if (!currentProject) return
    const loaded = await window.api.getTasks(currentProject.id)
    setTasks(loaded || [])
    // load tags for each task
    const map = {}
    await Promise.all(loaded.map(async t => {
      const tags = await window.api.getTaskTags(t.id)
      map[t.id] = tags.map(tg => tg.id)
    }))
    setTaskTagMap(map)
  }, [currentProject])

  useEffect(() => { loadTasks() }, [loadTasks])

  useEffect(() => {
    if (pendingTaskId && tasks.length > 0) {
      const match = tasks.find(t => t.id === pendingTaskId)
      if (match) {
        setSelectedTask(match)
        onPendingTaskConsumed?.()
      }
    }
  }, [pendingTaskId, tasks])

  useEffect(() => {
    window.api.getTags().then(t => setAllTags(t || []))
  }, [])

  const filteredTasks = activeTags.length === 0 ? tasks : tasks.filter(t => {
    const tids = taskTagMap[t.id] || []
    return activeTags.every(tagId => tids.includes(tagId))
  })

  function toggleTagFilter(tagId) {
    setActiveTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId])
  }

  async function handleStatusChange(task, newStatus) {
    await window.api.updateTask(task.id, { status: newStatus })
    loadTasks()
  }

  function handleDeleteTask(task) {
    if (selectedTask?.id === task.id) setSelectedTask(null)
    setTasks(prev => prev.filter(t => t.id !== task.id))
    let undone = false
    showToast(`"${task.title}" deleted`, {
      onUndo: () => { undone = true; setTasks(prev => [...prev, task].sort((a, b) => a.id - b.id)) },
      duration: 5000,
    })
    setTimeout(async () => { if (!undone) await window.api.deleteTask(task.id) }, 5000)
  }

  async function handleTimerToggle(e, task) {
    e.stopPropagation()
    if (activeTimer?.task_id === task.id) await stopTimer()
    else await startTimer({ ...task, project_id: currentProject.id })
    loadTasks()
  }

  async function handlePomodoro(task) {
    if (activeTimer?.task_id !== task.id) {
      await startTimer({ ...task, project_id: currentProject.id })
    }
    onOpenFocusPomodoro?.()
  }

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    const task      = tasks.find(t => t.id === active.id)
    const targetCol = COLUMNS.find(c => c.id === over.id)
    if (targetCol && task && task.status !== targetCol.id) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: targetCol.id } : t))
    }
  }

  async function handleSaveTemplate() {
    const name = `${currentProject.name} Template`
    await window.api.saveTemplate(currentProject.id, name)
    setSavedTemplate(true)
    setTimeout(() => setSavedTemplate(false), 2000)
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) { loadTasks(); return }
    const task      = tasks.find(t => t.id === active.id)
    const targetCol = COLUMNS.find(c => c.id === over.id)
    if (targetCol && task) {
      await window.api.updateTask(task.id, { status: targetCol.id })
      loadTasks()
    }
  }

  const activeTask    = activeId ? tasks.find(t => t.id === activeId) : null
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredTasks.filter(t => t.status === col.id)
    return acc
  }, {})

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <div className="flex-1 overflow-auto p-3 md:p-6">
          {/* Breadcrumb + controls */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'projects' })}
              className="flex items-center gap-1.5 text-sm text-th-text4 hover:text-th-text2 transition-colors">
              <ChevronLeft size={16} />Projects
            </button>
            <span className="text-th-text5">/</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject.color }} />
              <span className="text-sm font-medium text-th-text2">{currentProject.name}</span>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Tag filter */}
              <div className="relative">
                <button
                  onClick={() => setShowTagFilter(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTags.length > 0 ? 'bg-brand-500/20 text-brand-400' : 'bg-th-raised text-th-text4 hover:text-th-text2 hover:bg-th-card'
                  }`}
                >
                  <Tag size={12} />
                  {activeTags.length > 0 ? `${activeTags.length} tag${activeTags.length > 1 ? 's' : ''}` : 'Filter by tag'}
                </button>
                {showTagFilter && (
                  <div className="absolute right-0 top-9 w-52 bg-th-surface border border-th-border rounded-xl shadow-xl z-30 p-2"
                    onClick={e => e.stopPropagation()}>
                    {allTags.length === 0 && <p className="text-xs text-th-text5 px-2 py-1.5">No tags yet</p>}
                    {allTags.map(tag => (
                      <button key={tag.id} onClick={() => toggleTagFilter(tag.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-th-raised transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs text-th-text2 flex-1 text-left">{tag.name}</span>
                        {activeTags.includes(tag.id) && <Check size={11} className="text-brand-400" />}
                      </button>
                    ))}
                    {activeTags.length > 0 && (
                      <button onClick={() => setActiveTags([])} className="w-full text-xs text-th-text4 hover:text-th-text2 px-2 py-1.5 mt-1 border-t border-th-border">
                        Clear filter
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* View tabs */}
              <div className="flex items-center gap-0.5 bg-th-raised border border-th-border rounded-lg p-0.5">
                <button onClick={() => setBoardView('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${boardView === 'kanban' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                  <Kanban size={12} /> Board
                </button>
                <button onClick={() => setBoardView('diagram')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${boardView === 'diagram' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                  <GitBranch size={12} /> Diagram
                </button>
                <button onClick={() => setBoardView('mountain')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${boardView === 'mountain' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                  🏔 Mountain
                </button>
              </div>

              <button
                onClick={handleSaveTemplate}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  savedTemplate ? 'bg-green-500/20 text-green-400' : 'bg-th-raised text-th-text4 hover:text-th-text2 hover:bg-th-card'
                }`}
                title="Save as Template"
              >
                {savedTemplate ? <Check size={13} /> : <BookTemplate size={13} />}
                <span className="hidden sm:inline">{savedTemplate ? 'Saved!' : 'Save as Template'}</span>
              </button>
            </div>
          </div>

          {boardView === 'mountain' ? (
            <MountainView project={currentProject} tasks={tasks} />
          ) : boardView === 'diagram' ? (
            <ProjectDiagram projectId={currentProject.id} projectColor={currentProject.color} />
          ) : (
            <>
              {/* Kanban */}
              <div className="flex gap-5 items-start">
                {COLUMNS.map(col => (
                  <ColumnDropZone
                    key={col.id}
                    col={col}
                    tasks={tasksByStatus[col.id] || []}
                    selectedTask={selectedTask}
                    activeTimer={activeTimer}
                    onSelect={setSelectedTask}
                    onTimer={handleTimerToggle}
                    onPomodoro={handlePomodoro}
                    onDelete={handleDeleteTask}
                    onEdit={setSelectedTask}
                    onStatusChange={handleStatusChange}
                    onAddTask={setCreateStatus}
                  />
                ))}
              </div>

            </>
          )}
        </div>

        {selectedTask && (
          <TaskDetail
            panel
            taskId={selectedTask.id}
            projectId={currentProject.id}
            projectColor={currentProject.color}
            onClose={() => setSelectedTask(null)}
            onUpdated={() => { loadTasks(); loadProjects() }}
            onOpenFocusPomodoro={onOpenFocusPomodoro}
          />
        )}

        {createStatus && (
          <CreateTaskModal
            isOpen={!!createStatus}
            projectId={currentProject.id}
            initialStatus={createStatus}
            onClose={() => setCreateStatus(null)}
            onCreated={() => { loadTasks(); setCreateStatus(null) }}
          />
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="glass card-shadow border border-brand-500/50 rounded-xl p-4 w-72 opacity-90 shadow-2xl cursor-grabbing">
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${PRIORITY_BADGE[activeTask.priority]}`}>
              {activeTask.priority.charAt(0).toUpperCase() + activeTask.priority.slice(1)}
            </span>
            <p className="text-sm font-medium text-th-text1 leading-snug">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
