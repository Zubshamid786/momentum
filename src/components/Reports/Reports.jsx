import React, { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Download, FileText, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDuration, formatDateTime, formatDateShort, getDateRange, fillDateRange } from '../../utils/formatTime'
import ProductivityHeatmap from './ProductivityHeatmap'
import WorkTypeWidget from './WorkTypeWidget'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
]
const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6']

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass card-shadow rounded-lg px-3 py-2">
      <p className="text-xs text-th-text3 mb-1">{label}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0]?.value * 3600)}</p>
    </div>
  )
}
const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass card-shadow rounded-lg px-3 py-2">
      <p className="text-xs text-th-text3">{payload[0].name}</p>
      <p className="text-sm font-semibold text-th-text1">{formatDuration(payload[0].value)}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-th-card/60 border border-th-border/50 rounded-xl p-5">
      <div className={`inline-flex p-2.5 rounded-lg mb-3 ${accent}`}><Icon size={18} /></div>
      <p className="text-2xl font-bold text-th-text1 mb-1">{value}</p>
      <p className="text-sm text-th-text3">{label}</p>
    </div>
  )
}

export default function Reports() {
  const { state } = useApp()
  const { projects } = state
  const [period, setPeriod]               = useState('week')
  const [projectFilter, setProjectFilter] = useState('all')
  const [data, setData]                   = useState(null)
  const [loading, setLoading]             = useState(false)
  const [exporting, setExporting]         = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    const { from, to } = getDateRange(period)
    const filters = { from, to }
    if (projectFilter !== 'all') filters.projectId = parseInt(projectFilter)
    setData(await window.api.getReportData(filters))
    setLoading(false)
  }, [period, projectFilter])

  useEffect(() => { loadReport() }, [loadReport])

  async function exportPDF() {
    setExporting(true)
    try {
      const result = await window.api.exportPDF()
      if (result?.filePath) {
        // success — file saved
      }
    } finally {
      setExporting(false)
    }
  }

  async function exportCSV() {
    if (!data?.entries?.length) return
    setExporting(true)
    try {
      const headers = ['Date','Project','Task','Duration (min)','Start','End','Notes']
      const rows = data.entries.map(e => [
        e.start_time?.split('T')[0], e.project_name, e.task_title,
        Math.round(e.duration / 60), formatDateTime(e.start_time),
        e.end_time ? formatDateTime(e.end_time) : '', e.notes || '',
      ])
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      await window.api.exportCSV(csv, `momentum-${period}-${new Date().toISOString().split('T')[0]}.csv`)
    } finally {
      setExporting(false)
    }
  }

  const { from, to } = getDateRange(period)

  const chartByDay = data
    ? fillDateRange(data.byDay, from, to).map(d => ({ day: formatDateShort(d.day), hours: parseFloat((d.total / 3600).toFixed(2)) }))
    : []

  const pieData = (data?.byProject || []).filter(p => p.total > 0).map((p, i) => ({
    name: p.name, value: p.total, color: p.color || PIE_COLORS[i % PIE_COLORS.length],
  }))

  const barData = (data?.byProject || []).map((p, i) => ({
    name: p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name,
    hours: parseFloat((p.total / 3600).toFixed(2)),
    color: p.color || PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Guru analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductivityHeatmap />
        </div>
        <WorkTypeWidget />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-th-card border border-th-border rounded-lg p-0.5">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-2.5 md:px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p.id ? 'bg-th-raised text-th-text1' : 'text-th-text4 hover:text-th-text2'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <select
            className="bg-th-card border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500 max-w-[140px] md:max-w-none"
            value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={!data?.entries?.length}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-th-card border border-th-border hover:border-th-border/70 text-th-text2 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors">
            <Download size={13} />Export CSV
          </button>
          <button onClick={exportPDF} disabled={exporting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-th-card border border-th-border hover:border-th-border/70 text-th-text2 rounded-lg text-xs font-medium disabled:opacity-40 transition-colors">
            <FileText size={13} />{exporting ? 'Saving…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Clock}        label="Total Time"     value={formatDuration(data.totalTime)}  accent="bg-brand-500/15 text-brand-400" />
            <StatCard icon={TrendingUp}   label="Avg per Day"    value={formatDuration(Math.round(data.totalTime / Math.max(chartByDay.length, 1)))} accent="bg-purple-500/15 text-purple-400" />
            <StatCard icon={CheckCircle2} label="Tasks Completed" value={data.completedTasks} accent="bg-green-500/15 text-green-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-th-card/60 border border-th-border/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-th-text2 mb-5">Hours per Day</h3>
              {chartByDay.every(d => d.hours === 0) ? (
                <div className="flex items-center justify-center h-40 text-th-text5 text-sm">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartByDay} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.4)' }} />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-2 bg-th-card/60 border border-th-border/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-th-text2 mb-4">By Project</h3>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-th-text5 text-sm">No data</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full space-y-1.5 mt-2">
                    {pieData.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-th-text3 truncate max-w-[120px]">{p.name}</span>
                        </div>
                        <span className="text-xs font-medium text-th-text2">{formatDuration(p.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {barData.length > 0 && (
            <div className="bg-th-card/60 border border-th-border/50 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-th-text2 mb-5">Time by Project</h3>
              <ResponsiveContainer width="100%" height={Math.max(160, barData.length * 42)}>
                <BarChart data={barData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgb(var(--th-text4))', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgb(var(--th-text2))', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgb(var(--th-raised)/0.4)' }} />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Time Entries */}
          <div className="bg-th-card/60 border border-th-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-th-border/50">
              <h3 className="text-sm font-semibold text-th-text2">
                Time Entries <span className="ml-2 text-xs font-normal text-th-text4">({data.entries.length})</span>
              </h3>
            </div>
            {data.entries.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-th-text5 text-sm">No time entries for this period</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-th-border/50">
                        {['Project','Task','Date','Duration','Notes'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-th-text4 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-th-border/30">
                      {data.entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-th-raised/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.project_color }} />
                              <span className="text-th-text2 truncate max-w-[120px]">{entry.project_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-th-text3 truncate max-w-[180px]">{entry.task_title}</td>
                          <td className="px-5 py-3 text-th-text4 text-xs whitespace-nowrap">{formatDateTime(entry.start_time)}</td>
                          <td className="px-5 py-3"><span className="font-medium text-th-text2">{formatDuration(entry.duration)}</span></td>
                          <td className="px-5 py-3 text-th-text4 text-xs truncate max-w-[140px]">{entry.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-th-border/30">
                  {data.entries.map(entry => (
                    <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: entry.project_color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-th-text2 truncate font-medium">{entry.task_title}</p>
                        <p className="text-xs text-th-text5 truncate">{entry.project_name} · {formatDateTime(entry.start_time)}</p>
                        {entry.notes && <p className="text-xs text-th-text4 truncate mt-0.5 italic">{entry.notes}</p>}
                      </div>
                      <span className="text-sm font-semibold text-th-text2 shrink-0">{formatDuration(entry.duration)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
