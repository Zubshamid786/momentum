import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Square, Play, Pause, Clock, SkipForward, Timer, Minimize2, Maximize2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useSettings } from '../../context/SettingsContext'
import { formatDurationLong, formatDuration } from '../../utils/formatTime'

const QUOTES = [
  'Deep work is the superpower of the 21st century.',
  'One task at a time. That\'s all it takes.',
  'Progress, not perfection.',
  'The secret of getting ahead is getting started.',
  'Focus is the art of knowing what to ignore.',
  'Do the hard work, especially when you don\'t feel like it.',
]

const PHASE_LABEL = { work: 'Focus', break: 'Short Break', longBreak: 'Long Break' }
const PHASE_COLOR = { work: null, break: '#22c55e', longBreak: '#14b8a6' }

function playChime(phaseEnding) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    // Work ends → ascending two-note ding (break time)
    // Break ends → single lower note (back to focus)
    const notes = phaseEnding === 'work'
      ? [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.22 }]
      : [{ f: 392.00, t: 0 }]
    notes.forEach(({ f, t }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = f
      const start = ctx.currentTime + t
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.35, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.3)
      osc.start(start)
      osc.stop(start + 1.3)
    })
  } catch (_) {}
}

function sendNotification(title, body) {
  try {
    if (!('Notification' in window)) return
    const show = () => new Notification(title, { body, silent: true })
    if (Notification.permission === 'granted') { show() }
    else if (Notification.permission !== 'denied') { Notification.requestPermission().then(p => { if (p === 'granted') show() }) }
  } catch (_) {}
}

export default function FocusMode({ onClose, autoStartPomodoro = false }) {
  const { state, stopTimer, startTimer, pauseTimer, resumeTimer } = useApp()
  const { settings } = useSettings()
  const { activeTimer, timerSeconds, timerPaused } = state

  const [task, setTask]     = useState(null)
  const [quote, setQuote]   = useState('')
  const [mode, setMode]     = useState('free')       // 'free' | 'pomodoro'
  const [phase, setPhase]   = useState('work')       // 'work' | 'break' | 'longBreak'
  const [round, setRound]   = useState(1)
  const [paused, setPaused] = useState(false)
  const [pomSecs, setPomSecs] = useState(null)       // countdown seconds, null = not started
  const [minimized, setMinimized] = useState(false)  // collapse to floating corner widget
  const pomRef  = useRef(null)

  const phaseDuration = useCallback(() => {
    if (phase === 'work')      return settings.pomodoro_work_min * 60
    if (phase === 'longBreak') return settings.pomodoro_long_break_min * 60
    return settings.pomodoro_break_min * 60
  }, [phase, settings])

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    if (activeTimer) window.api.getTask(activeTimer.task_id).then(setTask)
  }, [activeTimer])

  useEffect(() => {
    if (autoStartPomodoro) startPomodoro()
  }, [autoStartPomodoro])

  // Sync Pomodoro pause state with global timer pause (bidirectional via AppContext)
  useEffect(() => {
    if (mode === 'pomodoro') setPaused(timerPaused)
  }, [timerPaused, mode])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Pomodoro countdown
  useEffect(() => {
    if (mode !== 'pomodoro' || pomSecs === null) { clearInterval(pomRef.current); return }
    if (paused) { clearInterval(pomRef.current); return }
    clearInterval(pomRef.current)
    pomRef.current = setInterval(() => {
      setPomSecs(s => {
        if (s <= 1) {
          clearInterval(pomRef.current)
          handlePhaseEnd()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(pomRef.current)
  }, [mode, pomSecs, paused, phase])

  function startPomodoro() {
    setMode('pomodoro')
    setPhase('work')
    setRound(1)
    setPomSecs(settings.pomodoro_work_min * 60)
    setPaused(false)
  }

  function handlePhaseEnd() {
    if (settings.pomodoro_sound) playChime(phase)

    if (phase === 'work') {
      const isLong = round % settings.pomodoro_long_after === 0
      const nextPhase = isLong ? 'longBreak' : 'break'
      setPhase(nextPhase)
      setPomSecs(isLong ? settings.pomodoro_long_break_min * 60 : settings.pomodoro_break_min * 60)
      sendNotification('Time for a break!', isLong ? 'Great work — take a long break.' : 'Focus session done — take a short break.')
    } else {
      setPhase('work')
      setRound(r => r + 1)
      setPomSecs(settings.pomodoro_work_min * 60)
      sendNotification('Break over — back to focus', `Starting round ${round + 1}.`)
    }
  }

  function skipPhase() { clearInterval(pomRef.current); handlePhaseEnd() }

  async function togglePause() {
    const next = !paused
    setPaused(next)
    if (next) await pauseTimer()
    else await resumeTimer()
  }

  function stopPomodoro() {
    clearInterval(pomRef.current)
    setMode('free')
    setPomSecs(null)
    setPaused(false)
    setPhase('work')
    setRound(1)
  }

  const color = PHASE_COLOR[phase] || task?.project_color || '#6366f1'

  // Ring for free mode: elapsed vs estimate
  const freeRadius = 90
  const freeCirc   = 2 * Math.PI * freeRadius
  const freePct    = task?.estimate > 0 ? Math.min(timerSeconds / task.estimate, 1) : null
  const freeDash   = freePct != null ? freeCirc * (1 - freePct) : freeCirc

  // Ring for pomodoro mode: countdown
  const pomRadius = 90
  const pomCirc   = 2 * Math.PI * pomRadius
  const pomTotal  = phaseDuration()
  const pomPct    = pomSecs !== null ? pomSecs / pomTotal : 1
  const pomDash   = pomCirc * (1 - pomPct)

  const ringColor  = mode === 'pomodoro' ? color : (task?.project_color || '#6366f1')
  const ringCirc   = mode === 'pomodoro' ? pomCirc : freeCirc
  const ringDash   = mode === 'pomodoro' ? pomDash : freeDash

  // ── Minimized floating widget (Picture-in-Picture) ─────────────────────────
  // Component stays mounted, so the Pomodoro countdown keeps running while the
  // rest of the app is fully interactive.
  if (minimized) {
    const miniR = 24, miniCirc = 2 * Math.PI * miniR
    const miniRemain = mode === 'pomodoro' ? pomPct : (freePct != null ? freePct : 1)
    const miniOffset = miniCirc * (1 - miniRemain)
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[290px] rounded-2xl border border-th-border bg-th-surface shadow-2xl overflow-hidden">
        <div className="h-1" style={{ backgroundColor: ringColor }} />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ringColor }}>
              {mode === 'pomodoro' ? <Timer size={12} /> : <Clock size={12} />}
              {mode === 'pomodoro' ? PHASE_LABEL[phase] : 'Focus'}
            </span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setMinimized(false)} title="Expand"
                className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors"><Maximize2 size={14} /></button>
              <button onClick={onClose} title="Exit focus"
                className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors"><X size={14} /></button>
            </div>
          </div>

          {task && (
            <div className="flex items-center gap-1.5 mb-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.project_color }} />
              {task.icon && <span className="text-sm leading-none">{task.icon}</span>}
              <span className="text-xs text-th-text2 truncate">{task.title}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative shrink-0" style={{ width: 54, height: 54 }}>
              <svg width={54} height={54} className="-rotate-90">
                <circle cx={27} cy={27} r={miniR} fill="none" stroke="currentColor" strokeWidth={5} className="text-th-border" />
                <circle cx={27} cy={27} r={miniR} fill="none" stroke={ringColor} strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={miniCirc} strokeDashoffset={miniOffset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-mono font-bold text-th-text1 tabular-nums leading-none">
                {mode === 'pomodoro'
                  ? (pomSecs !== null ? `${String(Math.floor(pomSecs / 60)).padStart(2, '0')}:${String(pomSecs % 60).padStart(2, '0')}` : `${settings.pomodoro_work_min}:00`)
                  : formatDurationLong(timerSeconds)}
              </div>
              {mode === 'free' && freePct != null && (
                <div className="text-xs text-th-text4 mt-1">{Math.round(freePct * 100)}% of estimate</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {mode === 'pomodoro' ? (
              <>
                <button onClick={togglePause}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ backgroundColor: ringColor + '22', color: ringColor }}>
                  {paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} />}{paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={skipPhase} title="Skip phase"
                  className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium text-th-text4 hover:text-th-text2 bg-th-raised hover:bg-th-card transition-colors">
                  <SkipForward size={14} />
                </button>
              </>
            ) : (
              <button onClick={async () => { await stopTimer(); onClose() }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ backgroundColor: ringColor + '22', color: ringColor }}>
                <Square size={13} fill="currentColor" /> Stop Timer
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-th-bg"
      style={{ backgroundImage: `radial-gradient(ellipse at center, ${ringColor}12 0%, transparent 70%)` }}
    >
      <div className="absolute top-6 right-6 flex items-center gap-1">
        {activeTimer && task && (
          <button onClick={() => setMinimized(true)}
            className="p-2 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors"
            title="Minimize to corner">
            <Minimize2 size={20} />
          </button>
        )}
        <button onClick={onClose}
          className="p-2 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors"
          title="Exit focus mode (Esc)">
          <X size={20} />
        </button>
      </div>

      {/* Mode toggle + phase dots — stacked at top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-max">
        <div className="flex items-center gap-1 bg-th-raised rounded-lg p-1">
          <button onClick={() => stopPomodoro()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'free' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
            <Clock size={13} /> Free
          </button>
          <button onClick={startPomodoro}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'pomodoro' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
            <Timer size={13} /> Pomodoro
          </button>
        </div>
        {mode === 'pomodoro' && (
          <div className="flex items-center gap-2">
            {Array.from({ length: settings.pomodoro_long_after }, (_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i < (round - 1) % settings.pomodoro_long_after ? 'bg-brand-400' : 'bg-th-border'}`} />
            ))}
            <span className="text-xs text-th-text5 ml-1">{PHASE_LABEL[phase]}</span>
          </div>
        )}
      </div>

      {activeTimer && task ? (
        <div className="flex flex-col items-center gap-6 md:gap-8 max-w-md w-full px-6 md:px-8 mt-16 md:mt-0">
          {/* Task info */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project_color }} />
              <span className="text-sm text-th-text4">{task.project_name}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {task.icon && <span className="text-3xl">{task.icon}</span>}
              <h1 className="text-2xl font-bold text-th-text1 leading-snug text-center">{task.title}</h1>
            </div>
          </div>

          {/* Ring */}
          <div className="relative flex items-center justify-center">
            <svg width={220} height={220} className="-rotate-90">
              <circle cx={110} cy={110} r={pomRadius} fill="none" stroke="currentColor" strokeWidth={8} className="text-th-border" />
              <circle cx={110} cy={110} r={pomRadius} fill="none"
                stroke={ringColor} strokeWidth={8} strokeLinecap="round"
                strokeDasharray={ringCirc} strokeDashoffset={ringDash}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute flex flex-col items-center">
              {mode === 'pomodoro' ? (
                <>
                  <span className="text-4xl font-mono font-bold text-th-text1 tabular-nums">
                    {pomSecs !== null
                      ? `${String(Math.floor(pomSecs / 60)).padStart(2,'0')}:${String(pomSecs % 60).padStart(2,'0')}`
                      : `${settings.pomodoro_work_min}:00`}
                  </span>
                  <span className="text-sm mt-1" style={{ color: ringColor }}>{PHASE_LABEL[phase]}</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-mono font-bold text-th-text1 tabular-nums">
                    {formatDurationLong(timerSeconds)}
                  </span>
                  {freePct != null && (
                    <span className="text-sm text-th-text4 mt-1">{Math.round(freePct * 100)}% of estimate</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Estimate bar (free mode) */}
          {mode === 'free' && task.estimate > 0 && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-th-text5 mb-1.5">
                <span>Logged today</span>
                <span>{formatDuration(task.today_time || 0)} / {formatDuration(task.estimate)}</span>
              </div>
              <div className="h-1.5 bg-th-raised rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min((task.today_time || 0) / task.estimate * 100, 100)}%`, backgroundColor: task.project_color }} />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {mode === 'pomodoro' ? (
              <>
                <button onClick={togglePause}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: ringColor + '25', color: ringColor }}>
                  {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={skipPhase}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-th-text4 hover:text-th-text2 bg-th-raised hover:bg-th-card transition-all">
                  <SkipForward size={15} /> Skip
                </button>
              </>
            ) : (
              <button onClick={async () => { await stopTimer(); onClose() }}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: ringColor + '25', color: ringColor }}>
                <Square size={16} fill="currentColor" /> Stop Timer
              </button>
            )}
          </div>

          <p className="text-sm text-th-text5 italic text-center max-w-xs">{quote}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm px-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center">
            <Clock size={28} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-th-text1 mb-2">No active timer</h2>
            <p className="text-sm text-th-text4">Start a timer on a task to enter focus mode.</p>
          </div>
          {mode === 'pomodoro' && pomSecs !== null && (
            <div className="relative flex items-center justify-center">
              <svg width={180} height={180} className="-rotate-90">
                <circle cx={90} cy={90} r={70} fill="none" stroke="currentColor" strokeWidth={6} className="text-th-border" />
                <circle cx={90} cy={90} r={70} fill="none"
                  stroke={ringColor} strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - pomSecs / pomTotal)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <span className="absolute text-2xl font-mono font-bold text-th-text1 tabular-nums">
                {`${String(Math.floor(pomSecs / 60)).padStart(2,'0')}:${String(pomSecs % 60).padStart(2,'0')}`}
              </span>
            </div>
          )}
          <button onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-th-raised text-th-text2 hover:bg-th-card transition-colors">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
