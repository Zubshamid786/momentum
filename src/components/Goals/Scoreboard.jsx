import React, { useEffect, useState, useCallback } from 'react'
import { Target, TrendingUp, CheckCircle2, ChevronRight, Trophy, AlertTriangle, Flame } from 'lucide-react'
import { formatDuration } from '../../utils/formatTime'

// Mini sparkline rendered in SVG
function Sparkline({ data, target, color }) {
  if (!data || data.length === 0) return null
  const W = 80, H = 28
  const max = Math.max(...data.map(d => d.value), target, 0.1)
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - (d.value / max) * H
    return `${x},${y}`
  }).join(' ')
  const targetY = H - (target / max) * H

  return (
    <svg width={W} height={H} className="shrink-0">
      {/* Target line */}
      <line x1={0} y1={targetY} x2={W} y2={targetY}
        stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="3 2" />
      {/* Sparkline */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * W
        const y = H - (d.value / max) * H
        const winning = d.value >= target
        return (
          <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 3 : 2}
            fill={winning ? '#22c55e' : '#ef4444'}
            stroke={i === data.length - 1 ? 'white' : 'none'}
            strokeWidth={1} />
        )
      })}
    </svg>
  )
}

function WigCard({ wig, onCommitSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(wig.commitment || '')

  const winning     = wig.leadTarget > 0 ? wig.leadActual >= wig.leadTarget : wig.lagPct >= 80
  const lagColor    = wig.lagPct >= 80 ? '#22c55e' : wig.lagPct >= 50 ? '#f59e0b' : '#ef4444'
  const daysLeft    = wig.target_date
    ? Math.ceil((new Date(wig.target_date) - new Date()) / 86400000)
    : null

  function handleSave() {
    onCommitSave(wig.id, wig.weekStart, draft)
    setEditing(false)
  }

  return (
    <div className={`glass-card card-shadow rounded-2xl p-5 border-l-4 transition-all`}
      style={{ borderLeftColor: wig.project_color || '#6366f1' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={13} style={{ color: wig.project_color || '#6366f1' }} />
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: wig.project_color || '#6366f1' }}>
              Wildly Important Goal
            </p>
          </div>
          <h3 className="text-sm font-bold text-th-text1 leading-snug">{wig.title}</h3>
          {wig.project_name && (
            <p className="text-xs text-th-text5 mt-0.5">{wig.project_name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {winning
            ? <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full"><Trophy size={10} /> Winning</span>
            : <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Behind</span>
          }
          {daysLeft !== null && (
            <span className={`text-xs font-medium ${daysLeft < 7 ? 'text-red-400' : daysLeft < 30 ? 'text-yellow-400' : 'text-th-text5'}`}>
              {daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>

      {/* Lag measure */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-th-text4 font-medium flex items-center gap-1">
            <TrendingUp size={11} /> {wig.lag_label} (lag)
          </span>
          <span className="font-bold tabular-nums" style={{ color: lagColor }}>
            {wig.lagCurrent}/{wig.lagTotal} — {wig.lagPct}%
          </span>
        </div>
        <div className="h-2.5 bg-th-raised rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${wig.lagPct}%`, backgroundColor: lagColor }} />
        </div>
      </div>

      {/* Lead measure + sparkline */}
      <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-th-raised/50 rounded-xl">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-th-text4 font-medium flex items-center gap-1 mb-1">
            <Flame size={11} className="text-orange-400" /> {wig.lead_label} this week (lead)
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold tabular-nums ${wig.leadActual >= wig.leadTarget ? 'text-green-400' : 'text-th-text1'}`}>
              {wig.lead_type === 'hours'
                ? wig.leadActual.toFixed(1)
                : wig.leadActual}
            </span>
            <span className="text-xs text-th-text5">
              / {wig.leadTarget}{wig.lead_type === 'hours' ? 'h' : ' tasks'} target
            </span>
          </div>
        </div>
        <Sparkline
          data={wig.history}
          target={wig.leadTarget}
          color={wig.project_color || '#6366f1'}
        />
      </div>

      {/* Commitment */}
      <div>
        <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <CheckCircle2 size={10} /> This week I commit to...
        </p>
        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="e.g. Complete chapters 3–5 and log 2h each day"
              className="w-full bg-th-raised border border-th-border rounded-lg px-3 py-2 text-xs text-th-text1 placeholder-th-text5 focus:outline-none focus:border-brand-500 resize-none transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors">
                Save
              </button>
              <button onClick={() => { setDraft(wig.commitment || ''); setEditing(false) }}
                className="px-3 py-1.5 rounded-lg text-xs text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left px-3 py-2 rounded-lg bg-th-raised/50 hover:bg-th-raised border border-th-border/40 hover:border-th-border transition-colors group">
            {wig.commitment
              ? <p className="text-xs text-th-text2">{wig.commitment}</p>
              : <p className="text-xs text-th-text5 italic">Tap to set your commitment...</p>
            }
            <ChevronRight size={12} className="float-right text-th-text5 group-hover:text-th-text3 mt-0.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function Scoreboard() {
  const [scoreData, setScoreData] = useState([])

  const load = useCallback(() => {
    window.api.getScoreboard().then(d => setScoreData(d || []))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCommitSave(wigId, weekStart, text) {
    await window.api.saveWigCommitment(wigId, weekStart, text)
    load()
  }

  if (scoreData.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Target size={15} className="text-brand-400" />
        <h2 className="text-sm font-semibold text-th-text2">4DX Scoreboard</h2>
        <span className="text-xs text-th-text5 ml-1">— your wildly important goals</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {scoreData.map(wig => (
          <WigCard key={wig.id} wig={wig} onCommitSave={handleCommitSave} />
        ))}
      </div>
    </div>
  )
}
