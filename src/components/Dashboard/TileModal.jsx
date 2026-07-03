import React, { useEffect, useState } from 'react'
import { X, Clock, CheckCircle2, Layers, FolderOpen } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { formatDuration, formatDateShort, fillDateRange } from '../../utils/formatTime'

const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6']

const TILE_META = {
  today:     { title: 'Time Today',       icon: Clock,         accent: 'text-brand-400' },
  month:     { title: 'Time This Month',  icon: Clock,         accent: 'text-purple-400' },
  completed: { title: 'Tasks Completed',  icon: CheckCircle2,  accent: 'text-green-400' },
  projects:  { title: 'Active Projects',  icon: Layers,        accent: 'text-orange-400' },
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-th-card border border-th-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-th-text3">{payload[0].name}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0].value)}</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-th-card border border-th-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-th-text3 mb-1">{label}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0].value * 3600)}</p>
    </div>
  )
}

// ── Time breakdown (today / month) ─────────────────────────────────────────────
function TimeBreakdown({ data, showChart }) {
  if (!data) return <Spinner />

  const { byProject, byTask, byDay } = data
  const total = byProject.reduce((s, p) => s + p.total, 0)

  const pieData = byProject
    .filter(p => p.total > 0)
    .map((p, i) => ({ name: p.name, value: p.total, color: p.color || PIE_COLORS[i % PIE_COLORS.length] }))

  // Build bar chart for month view
  let barData = []
  if (showChart && byDay) {
    const today = new Date().toISOString().split('T')[0]
    const from  = byDay.length ? byDay[0].day : today
    barData = fillDateRange(byDay, from, today).map(d => ({
      day: formatDateShort(d.day),
      hours: parseFloat((d.total / 3600).toFixed(2)),
    }))
  }

  const maxHours = Math.max(...barData.map(d => d.hours), 1)
  const yMax = Math.ceil(maxHours / 2) * 2

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-th-raised/50 rounded-xl">
        <span className="text-sm text-th-text3">Total</span>
        <span className="text-xl font-bold text-th-text1">{formatDuration(total)}</span>
      </div>

      {/* Month bar chart */}
      {showChart && barData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">Daily Hours</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, yMax]} tick={{ fill: 'rgb(var(--th-text4))', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.4)' }} />
              <Bar dataKey="hours" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By project */}
      {pieData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">By Project</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 self-center">
            {pieData.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-th-text3 truncate max-w-[140px]">{p.name}</span>
                </div>
                <span className="text-sm font-medium text-th-text2">{formatDuration(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By task */}
      {byTask.filter(t => t.total > 0).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">By Task</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {byTask.filter(t => t.total > 0).map(task => (
              <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-th-raised/40 rounded-lg">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-th-text2 truncate">{task.title}</p>
                  <p className="text-xs text-th-text5">{task.project_name}</p>
                </div>
                <span className="text-sm font-medium text-th-text2 shrink-0">{formatDuration(task.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && <p className="text-center text-sm text-th-text5 py-8">No time tracked yet</p>}
    </div>
  )
}

// ── Completed tasks ────────────────────────────────────────────────────────────
function CompletedTasks({ data }) {
  if (!data) return <Spinner />
  if (data.length === 0) return <p className="text-center text-sm text-th-text5 py-8">No completed tasks yet</p>

  // Group by project
  const byProject = {}
  data.forEach(t => {
    if (!byProject[t.project_name]) byProject[t.project_name] = { color: t.project_color, tasks: [] }
    byProject[t.project_name].tasks.push(t)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 bg-th-raised/50 rounded-xl">
        <span className="text-sm text-th-text3">Total completed</span>
        <span className="text-xl font-bold text-th-text1">{data.length}</span>
      </div>
      {Object.entries(byProject).map(([name, { color, tasks }]) => (
        <div key={name}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold text-th-text2">{name}</span>
            <span className="text-xs text-th-text5 bg-th-raised px-1.5 py-0.5 rounded-full">{tasks.length}</span>
          </div>
          <div className="space-y-1.5 ml-4">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-th-raised/40 rounded-lg">
                <CheckCircle2 size={13} className="text-green-400 shrink-0" />
                <span className="text-sm text-th-text2 flex-1 truncate">{t.title}</span>
                {t.updated_at && <span className="text-xs text-th-text5 shrink-0">{formatDateShort(t.updated_at)}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Active projects ────────────────────────────────────────────────────────────
function ActiveProjectsList({ projects, onSelectProject }) {
  const active = projects.filter(p => p.status === 'active')
  if (active.length === 0) return <p className="text-center text-sm text-th-text5 py-8">No active projects</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-th-raised/50 rounded-xl">
        <span className="text-sm text-th-text3">Total active</span>
        <span className="text-xl font-bold text-th-text1">{active.length}</span>
      </div>
      {active.map(p => {
        const pct = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0
        return (
          <button
            key={p.id}
            onClick={() => onSelectProject?.(p)}
            className="w-full text-left p-4 bg-th-raised/40 hover:bg-th-raised/70 active:bg-th-raised rounded-xl transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-sm font-semibold text-th-text1">{p.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-th-text4">
                <span><FolderOpen size={12} className="inline mr-1" />{p.task_count} tasks</span>
                <span className="font-medium text-th-text2">{formatDuration(p.total_time)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-th-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
              </div>
              <span className="text-xs text-th-text4 shrink-0 w-10 text-right">{pct}%</span>
            </div>
            <p className="text-xs text-th-text5 mt-1.5">{p.completed_tasks} of {p.task_count} tasks completed</p>
          </button>
        )
      })}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function TileModal({ type, projects, onClose, onSelectProject }) {
  const [data, setData] = useState(null)
  const meta = TILE_META[type]
  const Icon = meta.icon

  useEffect(() => {
    if (type === 'today')     window.api.getTodayBreakdown().then(setData)
    if (type === 'month')     window.api.getMonthBreakdown().then(setData)
    if (type === 'completed') window.api.getCompletedTasks().then(setData)
    if (type === 'projects')  setData(projects)
  }, [type])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-th-surface border border-th-border rounded-2xl shadow-2xl max-h-[80vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-th-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Icon size={18} className={meta.accent} />
            <h2 className="text-base font-semibold text-th-text1">{meta.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {type === 'today'     && <TimeBreakdown data={data} showChart={false} />}
          {type === 'month'     && <TimeBreakdown data={data} showChart={true} />}
          {type === 'completed' && <CompletedTasks data={data} />}
          {type === 'projects'  && <ActiveProjectsList projects={data || []} onSelectProject={onSelectProject} />}
        </div>
      </div>
    </div>
  )
}
