import React, { useEffect, useState, useCallback } from 'react'
import { Clock, CheckCircle2, Layers, TrendingUp, Play, Calendar, AlertCircle, ChevronRight, Target, Sun, Star, Moon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useApp } from '../../context/AppContext'
import { useSettings } from '../../context/SettingsContext'
import {
  formatDuration, formatDateTime, formatDateShort,
  isOverdue, isDueToday, fillDateRange, getDateRange,
} from '../../utils/formatTime'
import TileModal from './TileModal'
import Scoreboard from '../Goals/Scoreboard'
import DailyIntentionsModal from './DailyIntentionsModal'
import EndOfDayReviewModal from './EndOfDayReviewModal'
import TaskDetail from '../Projects/TaskDetail'

const PRIORITY_COLOR = {
  urgent: 'text-red-400 bg-red-400/10',
  high:   'text-orange-400 bg-orange-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low:    'text-th-text4 bg-th-raised',
}
const STATUS_COLOR = {
  todo:        'text-th-text3 bg-th-raised',
  in_progress: 'text-blue-400 bg-blue-400/10',
  done:        'text-green-400 bg-green-400/10',
  blocked:     'text-red-400 bg-red-400/10',
}
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked' }

const CHART_PERIODS = [
  { id: 'day',    label: 'Day' },
  { id: 'week',   label: 'Week' },
  { id: 'month',  label: 'Month' },
  { id: 'custom', label: 'Custom' },
]

function StatTile({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group glass-card card-shadow rounded-2xl p-5 text-left hover:border-th-border/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${accent}`}>
          <Icon size={18} />
        </div>
        <ChevronRight size={14} className="text-th-text5 group-hover:text-th-text3 transition-colors mt-1" />
      </div>
      <p className="text-2xl font-bold text-th-text1 mb-1">{value}</p>
      <p className="text-sm text-th-text3">{label}</p>
      {sub && <p className="text-xs text-th-text5 mt-1">{sub}</p>}
    </button>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-th-card border border-th-border rounded-lg px-3 py-2">
      <p className="text-xs text-th-text3">{label}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0].value * 3600)}</p>
    </div>
  )
}

function DeadlineCountdown({ dueDate, dueTime, notifyBefore }) {
  const [minutesLeft, setMinutesLeft] = useState(null)

  useEffect(() => {
    if (!dueDate || !dueTime) return
    function calc() {
      const deadline = new Date(`${dueDate}T${dueTime}`).getTime()
      const mins = (deadline - Date.now()) / 60000
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
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full animate-pulse">
      <Clock size={10} />
      {minutesLeft <= 0 ? 'Due now!' : `${minutesLeft}m left`}
    </span>
  )
}

function GoalBar({ label, current, goalSecs, color }) {
  const pct     = Math.min(current / goalSecs, 1)
  const over    = current > goalSecs
  const goalH   = (goalSecs / 3600).toFixed(0)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-th-text4 font-medium flex items-center gap-1.5">
          <Target size={12} /> {label}
        </span>
        <span className={`font-semibold tabular-nums ${over ? 'text-green-400' : 'text-th-text2'}`}>
          {formatDuration(current)} <span className="font-normal text-th-text5">/ {goalH}h</span>
        </span>
      </div>
      <div className="h-2 bg-th-raised rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: over ? '#22c55e' : color }} />
      </div>
      {over && <p className="text-xs text-green-400 mt-1">Goal reached! 🎉</p>}
    </div>
  )
}

// "08:00" → "8:00a"; returns null for missing/invalid
function fmtClock(t) {
  if (!t || !/^\d{2}:\d{2}/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'p' : 'a'
  const hr   = h % 12 === 0 ? 12 : h % 12
  return `${hr}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`
}

// Pill shown on a task row: overdue takes precedence, else urgent/high priority
function rowPill(task) {
  if (isOverdue(task.due_date) && task.status !== 'done') return { label: 'Overdue', cls: 'bg-red-500/15 text-red-400' }
  if (task.priority === 'urgent') return { label: 'Urgent', cls: 'bg-red-500/15 text-red-400' }
  if (task.priority === 'high')   return { label: 'High',   cls: 'bg-orange-500/15 text-orange-400' }
  return null
}

function TodayTaskRow({ task, onStart, onSelect, isRunning, isNext }) {
  const hasSubtasks = task.subtask_count > 0
  const allDone = hasSubtasks && task.subtask_done === task.subtask_count
  const timeLabel = fmtClock(task.due_time)
  const pill = rowPill(task)
  return (
    <div className="flex items-stretch gap-2.5 py-2 border-t border-th-border/30 first:border-t-0 group">
      {/* time rail */}
      <div className={`w-11 shrink-0 text-right text-xs font-semibold tabular-nums pt-0.5 ${isNext ? 'text-brand-400' : timeLabel ? 'text-th-text3' : 'text-th-text5'}`}>
        {timeLabel || '—'}
      </div>
      {/* project-color accent rail */}
      <div className="w-[3px] rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
      <button onClick={() => onSelect?.(task)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.icon && <span className="text-xs leading-none">{task.icon}</span>}
          <p className="text-sm text-th-text1 truncate group-hover:text-brand-400 transition-colors">{task.title}</p>
          {pill && <span className={`text-2xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${pill.cls}`}>{pill.label}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-th-text4 truncate">{task.project_name}</p>
          {hasSubtasks && (
            <span className={`text-xs flex-shrink-0 ${allDone ? 'text-green-400' : 'text-th-text5'}`}>
              ✓ {task.subtask_done}/{task.subtask_count}
            </span>
          )}
        </div>
      </button>
      <button
        onClick={() => onStart(task)}
        disabled={isRunning}
        className={`p-1.5 rounded-lg transition-colors shrink-0 self-center ${isRunning ? 'text-green-400 bg-green-500/20' : 'text-th-text4 hover:text-brand-400 hover:bg-brand-500/15'}`}
      >
        <Play size={11} fill="currentColor" />
      </button>
    </div>
  )
}

// Donut ring for the focal day-progress strip
function ProgressRing({ pct }) {
  const r = 23, circ = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: 54, height: 54 }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgb(var(--th-raised))" strokeWidth="6" />
        <circle cx="27" cy="27" r={r} fill="none" stroke="#818cf8" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 27 27)"
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-th-text1 font-bold leading-none" style={{ fontSize: 13 }}>{Math.round(pct * 100)}%</b>
        <span className="text-th-text4 uppercase tracking-wider" style={{ fontSize: 8, marginTop: 1 }}>day</span>
      </div>
    </div>
  )
}

function TodayCard({ summary, onStartTimer, onSelectTask, activeTimer, dailyGoalSecs = 0 }) {
  const { overdue, dueToday, inProgress, completedToday, todayTime, todayEntries = [], completedTasks = [] } = summary
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const allTasks = [
    ...overdue.map(t => ({ ...t, _section: 'overdue' })),
    ...dueToday.map(t => ({ ...t, _section: 'today' })),
    ...inProgress.filter(t => !overdue.find(o => o.id === t.id) && !dueToday.find(d => d.id === t.id)).map(t => ({ ...t, _section: 'progress' })),
  ]
  .sort((a, b) => {
    if (!a.due_time && !b.due_time) return 0
    if (!a.due_time) return 1
    if (!b.due_time) return -1
    return a.due_time.localeCompare(b.due_time)
  })
  .slice(0, 8)

  const hasAnything = allTasks.length > 0 || todayEntries.length > 0 || completedTasks.length > 0

  // Split agenda into timed + timeless; mark the next-up timed task
  const timed    = allTasks.filter(t => fmtClock(t.due_time))
  const timeless = allTasks.filter(t => !fmtClock(t.due_time))
  const nowHHMM  = (() => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` })()
  const nextId   = (timed.find(t => t.due_time >= nowHHMM) || {}).id

  // Focal progress metrics
  const tasksDone  = completedToday || 0
  const tasksTotal = tasksDone + allTasks.length
  const dayPct     = tasksTotal > 0 ? tasksDone / tasksTotal : 0
  const goalPct    = dailyGoalSecs > 0 ? Math.min(todayTime / dailyGoalSecs, 1) : 0
  const loggedTotal = todayEntries.reduce((s, e) => s + (e.total_time || 0), 0)

  return (
    <div className="bg-gradient-to-b from-th-card to-th-surface border border-th-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-th-raised shrink-0">
            <Sun size={19} className="text-th-text2" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-th-text1 tracking-tight">Today at a Glance</h2>
            <p className="text-xs text-th-text4">{todayLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {completedToday > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-1 rounded-full">
              <CheckCircle2 size={10} /> {completedToday}<span className="hidden md:inline"> done</span>
            </span>
          )}
          {overdue.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400 font-semibold bg-red-500/10 px-2 py-1 rounded-full">
              <AlertCircle size={10} /> {overdue.length}<span className="hidden md:inline"> overdue</span>
            </span>
          )}
          {todayTime > 0 && (
            <span className="flex items-center gap-1 text-xs text-th-text4 font-medium bg-th-raised px-2 py-1 rounded-full">
              <Clock size={10} /> {formatDuration(todayTime)}
            </span>
          )}
        </div>
      </div>

      {!hasAnything ? (
        <p className="text-sm text-th-text5 py-2 text-center">Nothing due today — clear schedule!</p>
      ) : (
        <>
          {/* Focal progress strip */}
          <div className="flex items-center gap-4 md:gap-5 px-3 md:px-4 py-3 rounded-xl bg-th-bg/40 border border-th-border/60 mb-4">
            {tasksTotal > 0 && (
              <div className="flex items-center gap-3">
                <ProgressRing pct={dayPct} />
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wider text-th-text4">Tasks</p>
                  <p className="text-sm font-semibold text-th-text1 mt-0.5">{tasksDone} of {tasksTotal} done</p>
                </div>
              </div>
            )}
            <div className="w-px h-10 bg-th-border hidden sm:block" />
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-bold uppercase tracking-wider text-th-text4">Focus time</p>
              <p className="text-sm font-semibold text-th-text1 mt-0.5">
                {formatDuration(todayTime)}
                {dailyGoalSecs > 0 && <span className="text-th-text4 font-normal text-xs"> / {Math.round(dailyGoalSecs / 3600)}h goal</span>}
              </p>
              {dailyGoalSecs > 0 && (
                <div className="h-1.5 rounded-full bg-th-raised mt-1.5 max-w-[230px] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${goalPct * 100}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)' }} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
            {/* Agenda */}
            <div>
              {allTasks.length === 0 && completedTasks.length === 0 ? (
                <p className="text-xs text-th-text5 py-2">No tasks due or in progress</p>
              ) : (
                <>
                  <p className="text-2xs font-bold uppercase tracking-wider text-th-text4 mb-1.5">To do · by time</p>
                  <div>
                    {timed.map(task => (
                      <TodayTaskRow key={task.id} task={task} onStart={onStartTimer} onSelect={onSelectTask}
                        isRunning={activeTimer?.task_id === task.id} isNext={task.id === nextId} />
                    ))}
                  </div>
                  {timeless.length > 0 && (
                    <>
                      <p className="text-2xs font-bold uppercase tracking-wider text-th-text5 mt-3 mb-0.5">Anytime</p>
                      <div>
                        {timeless.map(task => (
                          <TodayTaskRow key={task.id} task={task} onStart={onStartTimer} onSelect={onSelectTask}
                            isRunning={activeTimer?.task_id === task.id} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {completedTasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-th-border/20 space-y-1.5">
                  <p className="text-2xs font-bold text-th-text4 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={10} className="text-green-400" /> Completed today
                  </p>
                  {completedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500/60" />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {task.icon && <span className="text-xs leading-none">{task.icon}</span>}
                        <p className="text-xs text-th-text3 truncate line-through">{task.title}</p>
                      </div>
                      <span className="text-xs text-th-text4 shrink-0">{task.project_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time logged — raised panel */}
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-th-text4 mb-1.5">Time logged today</p>
              {todayEntries.length === 0 ? (
                <div className="rounded-xl bg-th-raised/40 border border-th-border/50 px-4 py-6 flex flex-col items-center text-center gap-1.5">
                  <Clock size={20} className="text-th-text5" />
                  <p className="text-xs text-th-text5">No time logged yet — start a timer on any task to track your work.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-th-raised/40 border border-th-border/50 p-3">
                  {todayEntries.map(entry => (
                    <div key={entry.task_id} className="flex items-center gap-2.5 py-2 border-t border-th-border/30 first:border-t-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.project_color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {entry.icon && <span className="text-xs leading-none">{entry.icon}</span>}
                          <span className="text-sm text-th-text2 truncate">{entry.task_title}</span>
                        </div>
                        <span className="text-xs text-th-text4">{entry.project_name}</span>
                      </div>
                      <span className="text-xs font-medium text-brand-400 shrink-0 tabular-nums">{formatDuration(entry.total_time)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-th-border/50">
                    <span className="text-2xs font-bold uppercase tracking-wider text-th-text4">Total</span>
                    <span className="text-xs font-semibold text-th-text1 tabular-nums">{formatDuration(loggedTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ProjectPulse({ projects, dailySummary, onSelectProject }) {
  const active = (projects || []).filter(p => p.status === 'active')
  const overdueByProject = {}
  if (dailySummary?.overdue) {
    for (const t of dailySummary.overdue) {
      overdueByProject[t.project_id] = (overdueByProject[t.project_id] || 0) + 1
    }
  }
  if (active.length === 0) {
    return <p className="text-sm text-th-text5 py-4 text-center">No active projects</p>
  }
  return (
    <div className="space-y-3">
      {active.map(p => {
        const pct      = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0
        const overdue  = overdueByProject[p.id] || 0
        const blocked  = p.blocked_tasks || 0
        return (
          <button key={p.id} onClick={() => onSelectProject?.(p)} className="w-full text-left group rounded-xl border border-th-border/40 bg-th-raised/30 hover:bg-th-raised/60 px-4 py-3 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <p className="text-sm font-medium text-th-text1 truncate">{p.name}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {overdue > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                    <AlertCircle size={9} />{overdue} overdue
                  </span>
                )}
                {blocked > 0 && (
                  <span className="text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">
                    {blocked} blocked
                  </span>
                )}
                {p.today_time > 0 && (
                  <span className="text-xs text-brand-400 font-medium">{formatDuration(p.today_time)} today</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-th-raised rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
              <span className="text-xs text-th-text4 tabular-nums shrink-0">
                {p.completed_tasks}/{p.task_count} <span className="text-th-text5">({pct}%)</span>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function UpcomingDeadlines({ tasks }) {
  const now = new Date()
  const sevenDays = new Date(now.getTime() + 7 * 86400000)
  const upcoming = (tasks || [])
    .filter(t => t.due_date && t.status !== 'done')
    .map(t => ({ ...t, _dueMs: new Date(t.due_date).getTime() }))
    .filter(t => t._dueMs <= sevenDays.getTime())
    .sort((a, b) => a._dueMs - b._dueMs)
    .slice(0, 8)

  if (upcoming.length === 0) {
    return <p className="text-sm text-th-text5 py-4 text-center">No tasks due in the next 7 days</p>
  }
  return (
    <div className="space-y-2">
      {upcoming.map(task => {
        const overdue  = isOverdue(task.due_date)
        const dueToday = isDueToday(task.due_date)
        const daysLeft = Math.ceil((task._dueMs - now.getTime()) / 86400000)
        let urgency = 'text-th-text5'
        if (overdue)        urgency = 'text-red-400'
        else if (dueToday)  urgency = 'text-yellow-400'
        else if (daysLeft <= 2) urgency = 'text-orange-400'
        return (
          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-th-border/40 bg-th-raised/30 hover:bg-th-raised/60 px-3 py-2.5 transition-colors">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {task.icon && <span className="text-xs leading-none">{task.icon}</span>}
                <p className="text-sm text-th-text1 truncate">{task.title}</p>
              </div>
              <p className="text-xs text-th-text5 truncate">{task.project_name}</p>
            </div>
            <div className={`text-xs font-medium shrink-0 ${urgency}`}>
              {overdue ? 'Overdue' : dueToday ? 'Today' : `${daysLeft}d`}
            </div>
            <div className="flex items-center gap-1 text-xs text-th-text5 shrink-0">
              <Calendar size={10} />{formatDateShort(task.due_date)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard({ onOpenFocusPomodoro }) {
  const { state, startTimer, dispatch } = useApp()
  const { settings } = useSettings()
  const { projects } = state
  const [data, setData]           = useState(null)
  const [dailySummary, setDailySummary] = useState(null)
  const [activeTile, setActiveTile] = useState(null)
  const [chartPeriod, setChartPeriod] = useState('week')
  const [customFrom, setCustomFrom]   = useState('')
  const [customTo, setCustomTo]       = useState('')
  const [chartData, setChartData]     = useState([])
  const [showMITs, setShowMITs]       = useState(false)
  const [showEOD, setShowEOD]         = useState(false)
  const [mits, setMits]               = useState([])
  const [selectedTask, setSelectedTask] = useState(null)

  const loadMITs = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    window.api.getDailyIntentions(todayStr).then(d => setMits(d || []))
  }, [])

  const loadDashboard = useCallback(() => {
    window.api.getDashboardData(-new Date().getTimezoneOffset()).then(setData)
    window.api.getDailySummary().then(setDailySummary)
    loadMITs()
  }, [loadMITs])

  useEffect(() => { loadDashboard() }, [state.activeTimer, loadDashboard])

  // Load chart data whenever period or custom range changes
  useEffect(() => {
    async function fetchChart() {
      let from, to
      if (chartPeriod === 'custom') {
        if (!customFrom || !customTo) return
        from = customFrom; to = customTo
      } else {
        const range = getDateRange(chartPeriod === 'day' ? 'today' : chartPeriod)
        from = range.from; to = range.to
      }
      const tzOffset = -new Date().getTimezoneOffset()
      const raw = await window.api.getChartData({ from, to, tzOffset })
      const filled = fillDateRange(raw, from, to)
      setChartData(filled.map(d => ({
        day: formatDateShort(d.day),
        hours: parseFloat((d.total / 3600).toFixed(2)),
      })))
    }
    fetchChart()
  }, [chartPeriod, customFrom, customTo])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxHours  = Math.max(...chartData.map(d => d.hours), 1)
  const yMax      = Math.ceil(maxHours / 2) * 2

  async function handleStartTimer(task) {
    await startTimer(task)
    loadDashboard()
  }

  const chartLabel = {
    day: "Today's Hours",
    week: 'Hours — Last 7 Days',
    month: 'Hours — This Month',
    custom: customFrom && customTo ? `${formatDateShort(customFrom)} – ${formatDateShort(customTo)}` : 'Custom Range',
  }[chartPeriod]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">

      {/* Daily intention banner + action buttons */}
      <div className="space-y-2">
        {/* MIT status strip — full width */}
        {mits.length > 0 ? (
          <div className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Star size={13} className="text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium flex-shrink-0">MITs:</span>
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
              {mits.map((m) => (
                <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 truncate max-w-[120px] ${
                  m.is_done
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 line-through'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                }`}>
                  {m.icon || ''} {m.title}
                </span>
              ))}
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400/70 ml-auto flex-shrink-0 font-medium">
              {mits.filter(m => m.is_done).length}/{mits.length}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-th-raised/50 border border-dashed border-th-border">
            <Star size={13} className="text-th-text4 shrink-0" />
            <span className="text-xs text-th-text4">No MITs set — tap Set MITs to add your top 3 tasks</span>
          </div>
        )}
        {/* Action buttons row — always side by side */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowMITs(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium transition-colors border border-amber-500/30"
          >
            <Star size={12} /> Set MITs
          </button>
          <button
            onClick={() => setShowEOD(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 text-xs font-medium transition-colors border border-violet-500/30"
          >
            <Moon size={12} /> End-of-Day Review
          </button>
        </div>
      </div>

      {/* Today at a Glance — hero, full-width, above stat tiles */}
      {dailySummary && (
        <TodayCard
          summary={dailySummary}
          onStartTimer={handleStartTimer}
          onSelectTask={t => setSelectedTask({ id: t.id, project_id: t.project_id, project_color: t.project_color })}
          activeTimer={state.activeTimer}
          dailyGoalSecs={(settings.daily_hour_goal || 0) * 3600}
        />
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Clock}        label="Time Today"      value={formatDuration(data.todayTime)}  sub={`${formatDuration(data.weekTime)} this week`} accent="bg-brand-500/15 text-brand-400"   onClick={() => setActiveTile('today')} />
        <StatTile icon={TrendingUp}   label="Time This Month" value={formatDuration(data.monthTime)}  accent="bg-purple-500/15 text-purple-400" onClick={() => setActiveTile('month')} />
        <StatTile icon={CheckCircle2} label="Tasks Completed" value={data.tasksCompleted} sub={`${data.tasksInProgress} in progress`} accent="bg-green-500/15 text-green-400"  onClick={() => setActiveTile('completed')} />
        <StatTile icon={Layers}       label="Active Projects" value={data.activeProjects} accent="bg-orange-500/15 text-orange-400" onClick={() => setActiveTile('projects')} />
      </div>

      {/* Chart + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-card card-shadow rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-th-text2">{chartLabel}</h2>
            <div className="flex items-center gap-1 bg-th-raised rounded-lg p-1">
              {CHART_PERIODS.map(p => (
                <button key={p.id} onClick={() => setChartPeriod(p.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartPeriod === p.id ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {chartPeriod === 'custom' && (
            <div className="flex items-center gap-2 mb-4">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="flex-1 bg-th-raised border border-th-border rounded-lg px-3 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500" />
              <span className="text-th-text5 text-xs">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="flex-1 bg-th-raised border border-th-border rounded-lg px-3 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500" />
            </div>
          )}

          {chartData.every(d => d.hours === 0) ? (
            <div className="flex items-center justify-center h-44 text-th-text5 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={chartData.length > 20 ? 8 : 22}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, yMax]} tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.5)' }} />
                <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 glass-card card-shadow rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-th-text2 mb-4">Project Pulse</h2>
          <ProjectPulse
            projects={projects}
            dailySummary={dailySummary}
            onSelectProject={p => dispatch({ type: 'SET_PROJECT', payload: p })}
          />
        </div>
      </div>

      {/* Active Tasks */}
      <div className="glass-card card-shadow rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-th-text2 mb-4">Active Tasks</h2>
        {data.upcomingTasks.length === 0 ? (
          <p className="text-sm text-th-text5 py-4 text-center">No active tasks — create a project and add tasks to get started</p>
        ) : (
          <div className="divide-y divide-th-border/40">
            {data.upcomingTasks.map(task => {
              const overdue   = isOverdue(task.due_date)
              const dueToday  = isDueToday(task.due_date)
              const isRunning = state.activeTimer?.task_id === task.id
              return (
                <div key={task.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => setSelectedTask({ id: task.id, project_id: task.project_id, project_color: task.project_color })}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-th-text1 truncate">{task.title}</p>
                      <DeadlineCountdown dueDate={task.due_date} dueTime={task.due_time} notifyBefore={task.notify_before} />
                      {overdue && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={11} />Overdue</span>}
                      {dueToday && !overdue && <span className="text-xs text-yellow-400">Due today</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                      <span className="text-xs text-th-text5 truncate">{task.project_name}</span>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:block text-xs text-th-text4">{formatDuration(task.total_time)}</span>
                    {task.due_date && (
                      <span className={`hidden sm:flex text-xs items-center gap-1 ${overdue ? 'text-red-400' : 'text-th-text5'}`}>
                        <Calendar size={11} />{formatDateShort(task.due_date)}{task.due_time && ` · ${task.due_time}`}
                      </span>
                    )}
                    <button
                      onClick={() => handleStartTimer(task)}
                      disabled={isRunning}
                      className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isRunning ? 'bg-green-500/20 text-green-400 cursor-default' : 'bg-th-raised hover:bg-brand-500/20 text-th-text2 hover:text-brand-400'
                      }`}
                    >
                      <Play size={11} fill="currentColor" />
                      <span className="hidden sm:inline">{isRunning ? 'Tracking' : 'Track'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Time Goals */}
      {(settings.daily_hour_goal > 0 || settings.weekly_hour_goal > 0) && (
        <div className="glass-card card-shadow rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-th-text2 mb-4">Time Goals</h2>
          <div className="flex gap-6 flex-wrap">
            {settings.daily_hour_goal > 0 && (
              <GoalBar
                label="Today"
                current={data.todayTime}
                goalSecs={settings.daily_hour_goal * 3600}
                color="#6366f1"
              />
            )}
            {settings.weekly_hour_goal > 0 && (
              <GoalBar
                label="This Week"
                current={data.weekTime}
                goalSecs={settings.weekly_hour_goal * 3600}
                color="#8b5cf6"
              />
            )}
          </div>
        </div>
      )}

      {/* 4DX Scoreboard */}
      <Scoreboard />

      {/* Tile drill-down modal */}
      {activeTile && (
        <TileModal
          type={activeTile}
          projects={projects}
          onClose={() => setActiveTile(null)}
          onSelectProject={p => { setActiveTile(null); dispatch({ type: 'SET_PROJECT', payload: p }) }}
        />
      )}

      {/* Daily Intentions modal */}
      <DailyIntentionsModal open={showMITs} onClose={() => setShowMITs(false)} onSaved={loadMITs} />

      {/* End-of-Day Review modal */}
      <EndOfDayReviewModal open={showEOD} onClose={() => setShowEOD(false)} />

      {/* Task detail — fixed full-screen overlay */}
      {selectedTask && (
        <TaskDetail
          taskId={selectedTask.id}
          projectId={selectedTask.project_id}
          projectColor={selectedTask.project_color}
          onClose={() => setSelectedTask(null)}
          onUpdated={loadDashboard}
          onOpenFocusPomodoro={onOpenFocusPomodoro}
        />
      )}
    </div>
  )
}
