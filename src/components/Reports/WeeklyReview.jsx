import React, { useEffect, useState, useCallback } from 'react'
import { X, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Clock, ArrowUpRight, ArrowDownRight, Minus, Target } from 'lucide-react'
import { formatDuration, formatDateShort } from '../../utils/formatTime'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'

const DAY_ABBR  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const PRIORITY_DOT = {
  urgent: 'bg-red-400', high: 'bg-orange-400',
  medium: 'bg-yellow-400', low: 'bg-th-text5',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass card-shadow rounded-lg px-3 py-2">
      <p className="text-xs text-th-text3">{label}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0].value * 3600)}</p>
    </div>
  )
}

function TrendBadge({ current, previous }) {
  if (!previous) return null
  const diff    = current - previous
  const pct     = previous > 0 ? Math.round(Math.abs(diff) / previous * 100) : null
  if (diff === 0) return <span className="flex items-center gap-1 text-xs text-th-text4"><Minus size={11} />Same</span>
  const up = diff > 0
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {pct !== null ? `${up ? '+' : '-'}${pct}%` : (up ? 'Up' : 'Down')} vs previous
    </span>
  )
}

function StatCard({ label, value, sub, trend, trendPrev }) {
  return (
    <div className="glass-card card-shadow rounded-xl p-4">
      <p className="text-xs text-th-text4 mb-1">{label}</p>
      <p className="text-2xl font-bold text-th-text1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-th-text5 mt-0.5">{sub}</p>}
      {trend !== undefined && <div className="mt-1"><TrendBadge current={trend} previous={trendPrev} /></div>}
    </div>
  )
}

function ProjectBars({ byProject, total }) {
  if (!byProject?.length) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-th-text2 mb-3">Time by Project</h3>
      <div className="space-y-2.5">
        {byProject.map(p => {
          const pct = total > 0 ? p.total / total : 0
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-th-text2 font-medium">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-th-text4">{Math.round(pct * 100)}%</span>
                  <span className="text-th-text3 font-medium w-16 text-right tabular-nums">{formatDuration(p.total)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-th-raised rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: p.color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ComparisonTab({ data }) {
  if (!data) return <div className="py-12 text-center text-th-text5 text-sm">Loading…</div>

  const { week, month } = data
  const weekDiff  = week.current.time  - week.previous.time
  const monthDiff = month.current.time - month.previous.time

  // Build side-by-side bar data for week comparison
  const buildWeekChart = (period) => {
    const map = {}
    period.days.forEach(d => { map[d.day] = d.total })
    const mon = new Date(period.from + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i)
      const str = d.toISOString().split('T')[0]
      return { day: DAY_ABBR[i], hours: parseFloat(((map[str] || 0) / 3600).toFixed(2)) }
    })
  }

  const thisWeekChart = buildWeekChart(week.current)
  const lastWeekChart = buildWeekChart(week.previous)
  const combined = thisWeekChart.map((d, i) => ({ ...d, prevHours: lastWeekChart[i].hours }))
  const maxH = Math.max(...combined.map(d => Math.max(d.hours, d.prevHours)), 1)

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Week comparison */}
      <div>
        <h3 className="text-sm font-semibold text-th-text2 mb-4">Week-over-Week</h3>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="glass-card card-shadow rounded-xl p-4">
            <p className="text-xs text-th-text4 mb-1">This Week</p>
            <p className="text-xl font-bold text-th-text1 tabular-nums">{formatDuration(week.current.time)}</p>
            <p className="text-xs text-th-text5 mt-0.5">{week.current.tasks} tasks done</p>
          </div>
          <div className="glass-card card-shadow rounded-xl p-4">
            <p className="text-xs text-th-text4 mb-1">Last Week</p>
            <p className="text-xl font-bold text-th-text1 tabular-nums">{formatDuration(week.previous.time)}</p>
            <p className="text-xs text-th-text5 mt-0.5">{week.previous.tasks} tasks done</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium mb-4 ${weekDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {weekDiff >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {weekDiff >= 0 ? '+' : ''}{formatDuration(Math.abs(weekDiff))} compared to last week
        </div>
        <div className="glass-card card-shadow rounded-xl p-4">
          <div className="flex items-center gap-4 mb-3 text-xs text-th-text4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-brand-500 inline-block" />This week</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-brand-500/30 inline-block" />Last week</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={combined} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, Math.ceil(maxH)]} tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="hours"     fill="#6366f1"   radius={[3,3,0,0]} name="This week" />
              <Bar dataKey="prevHours" fill="#6366f133" radius={[3,3,0,0]} name="Last week" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Month comparison */}
      <div>
        <h3 className="text-sm font-semibold text-th-text2 mb-4">Month-over-Month</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="glass-card card-shadow rounded-xl p-4">
            <p className="text-xs text-th-text4 mb-1">This Month</p>
            <p className="text-xl font-bold text-th-text1 tabular-nums">{formatDuration(month.current.time)}</p>
            <p className="text-xs text-th-text5 mt-0.5">{month.current.tasks} tasks done</p>
          </div>
          <div className="glass-card card-shadow rounded-xl p-4">
            <p className="text-xs text-th-text4 mb-1">Last Month</p>
            <p className="text-xl font-bold text-th-text1 tabular-nums">{formatDuration(month.previous.time)}</p>
            <p className="text-xs text-th-text5 mt-0.5">{month.previous.tasks} tasks done</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium ${monthDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {monthDiff >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {monthDiff >= 0 ? '+' : ''}{formatDuration(Math.abs(monthDiff))} compared to last month
        </div>
      </div>
    </div>
  )
}

export default function WeeklyReview({ onClose }) {
  const [tab,            setTab]            = useState('week')
  const [weekly,         setWeekly]         = useState(null)
  const [monthly,        setMonthly]        = useState(null)
  const [compare,        setCompare]        = useState(null)
  const [thisCommit,     setThisCommit]     = useState('')
  const [lastCommit,     setLastCommit]     = useState(null)
  const [commitSaved,    setCommitSaved]    = useState(false)

  // Compute monday of current and last week
  const getMondayStr = (offsetWeeks = 0) => {
    const now = new Date()
    const day = now.getDay()
    const d = new Date(now)
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - offsetWeeks * 7)
    return d.toISOString().split('T')[0]
  }

  const thisMonday = getMondayStr(0)
  const lastMonday = getMondayStr(1)

  useEffect(() => {
    window.api.getWeeklyReview(-new Date().getTimezoneOffset()).then(setWeekly)
    window.api.getMonthlyReview().then(setMonthly)
    window.api.getReviewComparison().then(setCompare)
    window.api.getWeeklyCommitment(thisMonday).then(r => { if (r) setThisCommit(r.commitment) })
    window.api.getWeeklyCommitment(lastMonday).then(setLastCommit)
  }, [])

  async function saveCommitment() {
    await window.api.saveWeeklyCommitment(thisMonday, thisCommit)
    setCommitSaved(true)
    setTimeout(() => setCommitSaved(false), 2000)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function renderWeek() {
    if (!weekly) return <div className="py-12 text-center text-th-text5 text-sm">Loading…</div>
    const byDayMap = {}
    weekly.byDay.forEach(d => { byDayMap[d.day] = d.total })
    const monday    = new Date(weekly.monday)
    const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      const str = d.toISOString().split('T')[0]
      return { day: DAY_ABBR[i], hours: parseFloat(((byDayMap[str] || 0) / 3600).toFixed(2)) }
    })
    const maxH = Math.max(...chartData.map(d => d.hours), 1)

    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="This Week" value={formatDuration(weekly.thisWeekTime)}
            trend={weekly.thisWeekTime} trendPrev={weekly.lastWeekTime} />
          <StatCard label="Tasks Done" value={weekly.completedTasks.length} sub="completed this week" />
          <StatCard label="Still Overdue" value={weekly.carriedOver.length} sub="tasks to reschedule" />
        </div>

        <div className="glass-card card-shadow rounded-xl p-4">
          <h3 className="text-sm font-semibold text-th-text2 mb-4">Daily Hours</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, Math.ceil(maxH)]} tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.5)' }} />
              <Bar dataKey="hours" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ProjectBars byProject={weekly.byProject} total={weekly.thisWeekTime} />

        {weekly.completedTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-th-text2 mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-400" /> Completed
            </h3>
            <div className="space-y-1.5">
              {weekly.completedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 bg-th-card/40 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.project_color }} />
                  {t.icon && <span className="text-sm leading-none shrink-0">{t.icon}</span>}
                  <span className="text-sm text-th-text2 flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-th-text5 shrink-0">{t.project_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {weekly.carriedOver.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-th-text2 mb-3 flex items-center gap-2">
              <AlertCircle size={15} className="text-orange-400" /> Still Overdue
            </h3>
            <div className="space-y-1.5">
              {weekly.carriedOver.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 bg-orange-400/5 border border-orange-400/20 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.project_color }} />
                  {t.icon && <span className="text-sm leading-none shrink-0">{t.icon}</span>}
                  <span className="text-sm text-th-text2 flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-red-400 shrink-0 flex items-center gap-1">
                    <Clock size={10} /> {t.due_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cadence of Accountability */}
        <div className="glass-card card-shadow rounded-xl p-4 space-y-4 border border-brand-500/20">
          <h3 className="text-sm font-semibold text-th-text1 flex items-center gap-2">
            <Target size={14} className="text-brand-400" /> Cadence of Accountability
          </h3>

          {lastCommit?.commitment && (
            <div className="bg-th-raised/60 rounded-lg px-3 py-2.5">
              <p className="text-xs font-medium text-th-text4 mb-1">Last week you committed to:</p>
              <p className="text-sm text-th-text2 italic">"{lastCommit.commitment}"</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-th-text3 mb-1.5">
              This week I commit to...
            </label>
            <textarea
              rows={2}
              value={thisCommit}
              onChange={e => setThisCommit(e.target.value)}
              placeholder="e.g. Complete chapters 3–5 and log at least 2h per day on the course"
              className="w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2 text-sm text-th-text1 placeholder-th-text5 focus:outline-none focus:border-brand-500 resize-none transition-colors"
            />
            <button
              onClick={saveCommitment}
              disabled={!thisCommit.trim()}
              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 transition-colors">
              {commitSaved ? '✓ Saved' : 'Save commitment'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderMonth() {
    if (!monthly) return <div className="py-12 text-center text-th-text5 text-sm">Loading…</div>
    const byDayMap = {}
    monthly.byDay.forEach(d => { byDayMap[d.day] = d.total })
    const firstDay = new Date(monthly.firstStr + 'T00:00:00')
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate()
    const chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(firstDay); d.setDate(firstDay.getDate() + i)
      const str = d.toISOString().split('T')[0]
      return { day: d.getDate(), hours: parseFloat(((byDayMap[str] || 0) / 3600).toFixed(2)) }
    })
    const maxH = Math.max(...chartData.map(d => d.hours), 1)
    const monthName = MONTH_ABBR[firstDay.getMonth()]

    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="This Month" value={formatDuration(monthly.thisMonthTime)}
            trend={monthly.thisMonthTime} trendPrev={monthly.lastMonthTime} />
          <StatCard label="Tasks Done" value={monthly.completedTasks.length} sub={`in ${monthName}`} />
        </div>

        <div className="glass-card card-shadow rounded-xl p-4">
          <h3 className="text-sm font-semibold text-th-text2 mb-4">Daily Hours — {monthName}</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[0, Math.ceil(maxH)]} tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.5)' }} />
              <Bar dataKey="hours" fill="#8b5cf6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ProjectBars byProject={monthly.byProject} total={monthly.thisMonthTime} />

        {monthly.completedTasks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-th-text2 mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-400" /> Completed This Month
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {monthly.completedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 bg-th-card/40 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.project_color }} />
                  {t.icon && <span className="text-sm leading-none shrink-0">{t.icon}</span>}
                  <span className="text-sm text-th-text2 flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-th-text5 shrink-0">{t.project_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const tabLabel = { week: 'Weekly Review', month: 'Monthly Review', compare: 'Comparison' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60" onClick={onClose}>
      <div
        className="relative bg-th-surface border border-th-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-th-border shrink-0">
          <h2 className="text-sm md:text-base font-semibold text-th-text1">{tabLabel[tab]}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Tab row — full width below header */}
        <div className="flex items-center gap-0.5 bg-th-raised/50 border-b border-th-border px-4 py-2 shrink-0">
          {['week', 'month', 'compare'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'week'    && renderWeek()}
          {tab === 'month'   && renderMonth()}
          {tab === 'compare' && <ComparisonTab data={compare} />}
        </div>
      </div>
    </div>
  )
}
