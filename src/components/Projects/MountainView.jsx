import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Wind, Sun, Cloud, CloudLightning, Snowflake, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const BASE_ELEV   = 1500
const SUMMIT_ELEV = 8849

function buildCamps(milestones) {
  if (!milestones.length) return []
  return milestones.map((m, i) => {
    const t    = milestones.length === 1 ? 1 : i / (milestones.length - 1)
    const elev = Math.round(BASE_ELEV + t * (SUMMIT_ELEV - BASE_ELEV))
    return { ...m, elevation: elev, t }
  })
}

// ── Mountain geometry ──────────────────────────────────────────────────────────
function mountainPath(w, h) {
  const peakX = w * 0.46; const peakY = h * 0.07
  const sLx = w * 0.15;  const sLy = h * 0.44   // left shoulder
  const rLx = w * 0.30;  const rLy = h * 0.21   // left ridge
  const rRx = w * 0.62;  const rRy = h * 0.23   // right ridge
  const sRx = w * 0.75;  const sRy = h * 0.46   // right shoulder
  const snowL = peakX - 36; const snowR = peakX + 30; const snowBase = peakY + 52

  const mountain = `M 0,${h}
    C 0,${h} ${sLx-50},${sLy+35} ${sLx},${sLy}
    C ${sLx+24},${sLy-24} ${rLx-14},${rLy+14} ${rLx},${rLy}
    C ${rLx+10},${rLy-10} ${peakX-18},${peakY+15} ${peakX},${peakY}
    C ${peakX+12},${peakY+11} ${rRx-10},${rRy-9} ${rRx},${rRy}
    C ${rRx+12},${rRy+11} ${sRx-24},${sRy-22} ${sRx},${sRy}
    C ${sRx+50},${sRy+35} ${w},${h} ${w},${h} Z`

  const snow = `M ${peakX},${peakY}
    C ${peakX-10},${peakY+18} ${snowL+8},${snowBase-14} ${snowL},${snowBase}
    C ${snowL+18},${snowBase+7} ${snowR-18},${snowBase+7} ${snowR},${snowBase}
    C ${snowR-8},${snowBase-14} ${peakX+8},${peakY+18} ${peakX},${peakY} Z`

  return { mountain, snow, peakX, peakY, rLx, rLy, rRx, rRy, sLx, sLy, sRx, sRy, snowBase }
}

// Distant background peak
function bgPeak(w, h, cx, top, wScale) {
  const half = w * wScale
  return `M ${cx - half},${h} Q ${cx - half*0.4},${top + h*0.15} ${cx},${top} Q ${cx + half*0.4},${top + h*0.15} ${cx + half},${h} Z`
}

// ── Ridge interpolation (left ridge: base → shoulder → ridge → peak) ──────────
function campXY(t, p, w, h) {
  const pts = [
    [w * 0.10, h * 0.93],
    [p.sLx, p.sLy],
    [p.rLx, p.rLy],
    [p.peakX, p.peakY],
  ]
  const seg  = t * (pts.length - 1)
  const i    = Math.min(Math.floor(seg), pts.length - 2)
  const frac = seg - i
  return {
    x: pts[i][0] + frac * (pts[i+1][0] - pts[i][0]),
    y: pts[i][1] + frac * (pts[i+1][1] - pts[i][1]),
  }
}

// Generate a smooth polyline along the route
function routeLine(p, w, h, steps = 50) {
  return Array.from({ length: steps + 1 }, (_, i) => campXY(i / steps, p, w, h))
}

// ── Weather ────────────────────────────────────────────────────────────────────
function getWeather(tasks) {
  const today  = new Date().toISOString().slice(0, 10)
  const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length
  const pct    = tasks.length ? tasks.filter(t => t.status === 'done').length / tasks.length : 0
  if (overdue >= 4) return { icon: Snowflake,      label: 'Blizzard',    color: '#93c5fd', bgDark: '#1a2d5a', bgLight: '#dbeafe', desc: 'Multiple deadlines missed' }
  if (overdue >= 2) return { icon: CloudLightning, label: 'Storm',       color: '#f87171', bgDark: '#3d1515', bgLight: '#fee2e2', desc: 'Overdue tasks piling up' }
  if (overdue === 1)return { icon: Cloud,          label: 'Overcast',    color: '#94a3b8', bgDark: '#1a2233', bgLight: '#f1f5f9', desc: 'One task overdue' }
  if (pct >= 0.8)   return { icon: Sun,            label: 'Clear skies', color: '#fbbf24', bgDark: '#2d2208', bgLight: '#fefce8', desc: 'Summit within reach!' }
  return              { icon: Wind,            label: 'Fair winds',  color: '#86efac', bgDark: '#0a2218', bgLight: '#f0fdf4', desc: 'On track' }
}

// ── Improved Climber ───────────────────────────────────────────────────────────
function Climber({ x, y, color }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Soft aura */}
      <circle cx={0} cy={-14} r={13} fill={color} opacity={0.12} />
      {/* Backpack */}
      <rect x={-6} y={-15} width={5} height={10} rx={1.5} fill={color} opacity={0.55} />
      {/* Torso */}
      <rect x={-3.5} y={-16} width={7} height={11} rx={2.5} fill={color} />
      {/* Helmet */}
      <circle cx={0} cy={-22} r={5.5} fill={color} />
      <path d="M -5.5,-22 Q -5.5,-29 0,-29 Q 5.5,-29 5.5,-22 Z" fill={color} opacity={0.8} />
      {/* Left arm + axe */}
      <path d="M -3.5,-13 L -9,-9 L -10,-7" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      {/* Right arm */}
      <path d="M 3.5,-13 L 9,-10 L 11,-8" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
      {/* Ice axe */}
      <line x1={11} y1={-8} x2={14} y2={1}  stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
      <line x1={10} y1={-6} x2={15} y2={-9} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
      {/* Legs */}
      <path d="M -1,-5 L -4,4 L -5,8"  stroke={color} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d="M 1,-5 L 4,4 L 5,8"    stroke={color} strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </g>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MountainView({ project, tasks }) {
  const [milestones,   setMilestones]   = useState([])
  const [selectedCamp, setSelectedCamp] = useState(null)
  const [animPct,      setAnimPct]      = useState(0)
  const svgRef       = useRef(null)
  const containerRef = useRef(null)
  const animRef      = useRef(null)
  const [svgSize,    setSvgSize]    = useState({ w: 700, h: 420 })
  const [isNarrow,   setIsNarrow]   = useState(false)

  useEffect(() => {
    if (!project) return
    window.api.getMilestones(project.id).then(ms => setMilestones(ms || []))
  }, [project?.id])

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSvgSize({ w: width, h: height > 0 ? height : Math.round(width * 0.54) })
    })
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  // Layout switch: narrow (<640px actual rendered width) → stacked, wide → side-by-side
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => {
      setIsNarrow(e.contentRect.width < 640)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const totalTasks = tasks.length
  const doneTasks  = tasks.filter(t => t.status === 'done').length
  const pct        = totalTasks ? doneTasks / totalTasks : 0

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    let cur = animPct
    const target = pct
    function step() {
      const d = target - cur
      if (Math.abs(d) < 0.0015) { setAnimPct(target); return }
      cur += d * 0.055
      setAnimPct(cur)
      animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
  }, [pct])  // eslint-disable-line

  const camps   = useMemo(() => buildCamps(milestones), [milestones])
  const weather = useMemo(() => getWeather(tasks),      [tasks])
  const paths   = useMemo(() => mountainPath(svgSize.w, svgSize.h), [svgSize])

  const routeFull = useMemo(() => routeLine(paths, svgSize.w, svgSize.h, 60), [paths, svgSize])
  const routeDone = useMemo(() => {
    const steps = 60
    const pts   = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (t > animPct + 0.005) break
      pts.push(campXY(t, paths, svgSize.w, svgSize.h))
    }
    return pts
  }, [paths, svgSize, animPct])

  const climberPos   = campXY(animPct, paths, svgSize.w, svgSize.h)
  const projectColor = project?.color || '#7c3aed'
  const isDark       = document.documentElement.classList.contains('dark')

  const campTasks = useMemo(() => {
    if (!selectedCamp) return []
    return tasks.filter(t => t.due_date === selectedCamp.due_date)
  }, [selectedCamp, tasks])

  const elevGained  = Math.round(BASE_ELEV + animPct * (SUMMIT_ELEV - BASE_ELEV))
  const remainingM  = Math.round(SUMMIT_ELEV - elevGained)
  const allDone     = doneTasks === totalTasks && totalTasks > 0
  const campsReached= camps.filter(c => c.done_tasks >= c.total_tasks && c.total_tasks > 0).length

  const pace = (() => {
    const weekAgo   = new Date(Date.now() - 7*86400000).toISOString().slice(0, 10)
    const recent    = tasks.filter(t => t.status === 'done' && t.updated_at?.slice(0,10) >= weekAgo).length
    return recent || 1
  })()
  const daysToSummit = totalTasks ? Math.ceil((totalTasks - doneTasks) / (pace / 7)) : 0

  // Circular ring geometry
  const ringR    = 38
  const ringCirc = 2 * Math.PI * ringR
  const ringDash = ringCirc * (1 - pct)

  // HUD elevation badge position (keep within canvas)
  const hudX = Math.min(climberPos.x + 20, svgSize.w - 62)
  const hudY = climberPos.y - 32

  return (
    <div
      ref={containerRef}
      className={`flex gap-3 p-3 ${isNarrow ? 'flex-col overflow-y-auto' : 'flex-row h-full min-h-0 overflow-hidden'}`}
    >

      {/* ══════════════════════════════ Mountain Canvas ══════════════════════ */}
      <div className={`flex flex-col gap-3 min-w-0 ${isNarrow ? '' : 'flex-1'}`}>

        {/* Top bar */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              backgroundColor: isDark ? weather.bgDark : weather.bgLight,
              border: `1px solid ${weather.color}25`,
            }}>
            <weather.icon size={12} style={{ color: weather.color }} />
            <span className="font-semibold" style={{ color: weather.color }}>{weather.label}</span>
            {!isNarrow && <span className="opacity-60" style={{ color: weather.color }}>— {weather.desc}</span>}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold tabular-nums" style={{ color: projectColor }}>
              {elevGained.toLocaleString()}m
            </span>
            <span className="text-th-text5">·</span>
            <span className="text-th-text4">{doneTasks}/{totalTasks}</span>
          </div>
        </div>

        {/* SVG Mountain */}
        <div ref={svgRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            ...(isNarrow ? { aspectRatio: '37/20' } : { flex: 1, minHeight: 0 }),
            background: isDark
              ? 'linear-gradient(180deg,#020b18 0%,#051324 25%,#0a1e38 55%,#10284a 80%,#152f56 100%)'
              : 'linear-gradient(180deg,#5b90c8 0%,#7aacd8 25%,#9ec3e4 55%,#c1d9ef 80%,#ddeaf8 100%)',
            boxShadow: `inset 0 0 80px 0 ${projectColor}08`,
          }}>

          {/* Stars (dark mode) */}
          {isDark && (
            <svg style={{ position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none' }}>
              {[...Array(50)].map((_, i) => {
                const r = i % 5 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.65
                const op = 0.08 + (i % 9) * 0.075
                return (
                  <circle key={i}
                    cx={`${(i*41+17)%97}%`} cy={`${(i*31+3)%54}%`}
                    r={r} fill="white" opacity={op}>
                    {i % 7 === 0 && (
                      <animate attributeName="opacity"
                        values={`${op};${op*0.25};${op}`}
                        dur={`${2.5+(i%5)*0.6}s`} repeatCount="indefinite" />
                    )}
                  </circle>
                )
              })}
            </svg>
          )}

          <svg width={svgSize.w} height={svgSize.h}
            viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
            style={{ display:'block', width:'100%', height:'100%' }}>
            <defs>
              <linearGradient id="mv-mtGrad" x1="0.2" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={isDark ? '#1e3260' : '#7a9bc4'} />
                <stop offset="50%"  stopColor={isDark ? '#112040' : '#6080a8'} />
                <stop offset="100%" stopColor={isDark ? '#08101e' : '#496090'} />
              </linearGradient>
              <linearGradient id="mv-shadowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={isDark ? '#020810' : '#2a405e'} stopOpacity="0.65" />
                <stop offset="55%"  stopColor="transparent" />
              </linearGradient>
              <linearGradient id="mv-snowGrad" x1="0.3" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={isDark ? '#eef2ff' : '#ffffff'} />
                <stop offset="100%" stopColor={isDark ? '#b8c8ee' : '#d8e8f8'} stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="mv-progressGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%"   stopColor={projectColor} stopOpacity="0.45" />
                <stop offset="100%" stopColor={projectColor} stopOpacity="0.05" />
              </linearGradient>
              <radialGradient id="mv-fogGrad" cx="50%" cy="100%" r="65%">
                <stop offset="0%"   stopColor={isDark ? '#0a1828' : '#b8d0e8'} stopOpacity="0.7" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="mv-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="mv-softGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* ── Distant mountain range ─────────────────────────────── */}
            <path d={bgPeak(svgSize.w, svgSize.h, svgSize.w*0.72, svgSize.h*0.22, 0.30)}
              fill={isDark ? '#0c1e38' : '#8fb4d0'} opacity={0.55} />
            <path d={bgPeak(svgSize.w, svgSize.h, svgSize.w*0.82, svgSize.h*0.31, 0.20)}
              fill={isDark ? '#0e2240' : '#9dc0d8'} opacity={0.45} />
            <path d={bgPeak(svgSize.w, svgSize.h, svgSize.w*0.90, svgSize.h*0.40, 0.15)}
              fill={isDark ? '#101f38' : '#aac8dc'} opacity={0.4} />

            {/* ── Main mountain body ─────────────────────────────────── */}
            <path d={paths.mountain} fill="url(#mv-mtGrad)" />
            {/* Shadow face (left) */}
            <path d={paths.mountain} fill="url(#mv-shadowGrad)" />
            {/* Subtle outline */}
            <path d={paths.mountain} fill="none"
              stroke={isDark ? '#2a4070' : '#5a7a9e'} strokeWidth={0.8} opacity={0.5} />

            {/* ── Progress fill ──────────────────────────────────────── */}
            <clipPath id="mv-progressClip">
              <rect x={0} y={climberPos.y - 2} width={svgSize.w} height={svgSize.h} />
            </clipPath>
            <path d={paths.mountain} fill="url(#mv-progressGrad)" clipPath="url(#mv-progressClip)" />

            {/* ── Snow cap ───────────────────────────────────────────── */}
            <path d={paths.snow} fill="url(#mv-snowGrad)" />
            <path d={paths.snow} fill="none"
              stroke={isDark ? '#7080b0' : '#a0b8d0'} strokeWidth={0.6} opacity={0.45} />

            {/* ── Base fog ───────────────────────────────────────────── */}
            <rect x={0} y={svgSize.h * 0.68} width={svgSize.w} height={svgSize.h * 0.32}
              fill="url(#mv-fogGrad)" />

            {/* ── Full route (dim, dashed) ───────────────────────────── */}
            <polyline
              points={routeFull.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={isDark ? '#1e3a6e' : '#6a90b8'}
              strokeWidth={1.8}
              strokeDasharray="5,5"
              opacity={0.45} />

            {/* ── Completed route (glowing) ──────────────────────────── */}
            {routeDone.length > 1 && (
              <>
                {/* Glow layer */}
                <polyline
                  points={routeDone.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={projectColor} strokeWidth={5}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.2} />
                {/* Bright layer */}
                <polyline
                  points={routeDone.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={projectColor} strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
              </>
            )}

            {/* ── Camp markers ───────────────────────────────────────── */}
            {camps.map((camp, i) => {
              const { x, y } = campXY(camp.t, paths, svgSize.w, svgSize.h)
              const done     = camp.done_tasks >= camp.total_tasks && camp.total_tasks > 0
              const isActive = !done && camps.slice(0,i).every(c => c.done_tasks >= c.total_tasks && c.total_tasks > 0)
              const isLast   = i === camps.length - 1
              const selected = selectedCamp?.id === camp.id

              return (
                <g key={camp.id} onClick={() => setSelectedCamp(selected ? null : camp)}
                  style={{ cursor: 'pointer' }} filter={done || isActive ? 'url(#mv-glow)' : undefined}>

                  {/* Outer pulse (active camp) */}
                  {isActive && (
                    <circle cx={x} cy={y} r={14} fill={projectColor} opacity={0.18}>
                      <animate attributeName="r"       values="12;20;12" dur="2.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.18;0;0.18" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Selection ring */}
                  {selected && <circle cx={x} cy={y} r={14} fill="none" stroke={projectColor} strokeWidth={2} opacity={0.7} />}

                  {/* Main dot */}
                  <circle cx={x} cy={y} r={done ? 9 : isActive ? 8 : 6}
                    fill={done ? projectColor : isActive ? projectColor+'33' : (isDark ? '#0d1a30' : '#ddeaf8')}
                    stroke={done || isActive ? projectColor : isDark ? '#2a4070' : '#7a9cc0'}
                    strokeWidth={done ? 0 : 1.8} />

                  {/* Inner icon */}
                  {done ? (
                    <text x={x} y={y+3.5} fontSize={9} textAnchor="middle" fill="#fff" fontWeight="bold">✓</text>
                  ) : isActive ? (
                    <circle cx={x} cy={y} r={2.5} fill={projectColor} />
                  ) : (
                    <text x={x} y={y+3} fontSize={7} textAnchor="middle"
                      fill={isDark ? '#3a5a80' : '#6a90b8'} fontWeight="bold">{i+1}</text>
                  )}

                  {/* Floating label (selected or last) */}
                  {(selected || isLast) && (() => {
                    const label = isLast ? '⛰ Summit' : camp.title.length > 14 ? camp.title.slice(0,12)+'…' : camp.title
                    const lw    = Math.max(label.length * 5.5 + 16, 60)
                    return (
                      <g>
                        <rect x={x - lw/2} y={y - 28} width={lw} height={16} rx={8}
                          fill={isDark ? 'rgba(10,18,32,0.9)' : 'rgba(240,248,255,0.92)'}
                          stroke={projectColor} strokeWidth={0.8} strokeOpacity={0.5} />
                        <text x={x} y={y - 17}
                          fontSize={8.5} textAnchor="middle" fontWeight="600"
                          fill={isDark ? '#c8d8f0' : '#334466'}
                          style={{ fontFamily:'Inter,sans-serif', userSelect:'none' }}>
                          {label}
                        </text>
                      </g>
                    )
                  })()}
                </g>
              )
            })}

            {/* ── Summit celebration ─────────────────────────────────── */}
            {allDone && (
              <>
                <circle cx={paths.peakX} cy={paths.peakY} r={18} fill={projectColor} opacity={0.25}>
                  <animate attributeName="r"       values="18;30;18" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.25;0;0.25" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <text x={paths.peakX} y={paths.peakY - 24} fontSize={20} textAnchor="middle">🚩</text>
              </>
            )}

            {/* ── Climber ────────────────────────────────────────────── */}
            <g filter="url(#mv-softGlow)">
              <Climber x={climberPos.x} y={climberPos.y} color={projectColor} />
            </g>

            {/* ── Elevation HUD badge ────────────────────────────────── */}
            <g transform={`translate(${hudX},${hudY})`}>
              <rect x={0} y={-13} width={58} height={18} rx={9}
                fill={isDark ? 'rgba(5,12,24,0.88)' : 'rgba(240,248,255,0.92)'}
                stroke={projectColor} strokeWidth={0.8} strokeOpacity={0.6} />
              <text x={29} y={0}
                fontSize={9.5} textAnchor="middle" fontWeight="700"
                fill={projectColor}
                style={{ fontFamily:'Inter,sans-serif', fontVariantNumeric:'tabular-nums' }}>
                {elevGained.toLocaleString()}m
              </text>
            </g>

          </svg>
        </div>
      </div>

      {/* ══════════════════════════════ Right Panel ══════════════════════════ */}
      <div className={`shrink-0 flex flex-col gap-3 ${isNarrow ? 'w-full' : 'w-[268px] min-h-0'}`}>

        {/* ── Elevation Hero Card ────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 relative overflow-hidden shrink-0"
          style={{
            background: isDark
              ? 'linear-gradient(140deg,#0f172a 0%,#141e35 100%)'
              : 'linear-gradient(140deg,#f0f4ff 0%,#e6eeff 100%)',
            border: `1px solid ${projectColor}28`,
            boxShadow: `0 4px 24px ${projectColor}14`,
          }}>
          {/* Background glow blob */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{ backgroundColor: projectColor }} />

          <div className="relative flex items-center gap-4">
            {/* Circular progress ring */}
            <svg width={90} height={90} viewBox="0 0 90 90" className="shrink-0">
              {/* Track */}
              <circle cx={45} cy={45} r={ringR} fill="none"
                stroke={isDark ? '#1a2846' : '#d8e0f5'} strokeWidth={7} />
              {/* Progress */}
              <circle cx={45} cy={45} r={ringR} fill="none"
                stroke={projectColor} strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${ringCirc}`}
                strokeDashoffset={`${ringDash}`}
                transform="rotate(-90 45 45)"
                style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
              {/* Percentage */}
              <text x={45} y={41} textAnchor="middle" fontSize={15}
                fill={projectColor} fontWeight="800"
                style={{ fontFamily:'Inter,sans-serif' }}>
                {Math.round(pct * 100)}%
              </text>
              <text x={45} y={52} textAnchor="middle" fontSize={8}
                fill={isDark ? '#3a5070' : '#8898b8'}
                style={{ fontFamily:'Inter,sans-serif' }}>
                ascent
              </text>
            </svg>

            {/* Elevation stat */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ color: isDark ? '#3a5070' : '#8898b8' }}>Altitude</p>
              <p className="text-[32px] font-black leading-none tabular-nums"
                style={{ color: projectColor }}>
                {elevGained.toLocaleString()}
              </p>
              <p className="text-xs mt-0.5 font-medium"
                style={{ color: isDark ? '#3a5070' : '#8898b8' }}>metres</p>
            </div>
          </div>

          {/* stats grid — 4 cols when narrow (full-width panel), 2×2 on desktop */}
          <div className={`mt-3.5 grid gap-2 ${isNarrow ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {[
              { label: 'To Summit',  value: allDone ? '✓ Summited' : `${remainingM.toLocaleString()}m` },
              { label: 'Camps',      value: `${campsReached} / ${camps.length}` },
              { label: 'Tasks Done', value: `${doneTasks} / ${totalTasks}` },
              { label: allDone ? 'Status' : 'Est. Days', value: allDone ? '🏆 Done!' : `~${daysToSummit}d` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: isDark ? '#09101e' : '#ffffff',
                  border: `1px solid ${isDark ? '#1a2540' : '#e0e8f5'}`,
                }}>
                <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: isDark ? '#2a3a58' : '#9aabca' }}>{label}</p>
                <p className="text-sm font-bold tabular-nums"
                  style={{ color: isDark ? '#c8d8f0' : '#1e2d48' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Route Timeline ─────────────────────────────────────────────── */}
        <div className={`rounded-2xl flex flex-col overflow-hidden ${isNarrow ? '' : 'flex-1 min-h-0'}`}
          style={{
            background:  isDark ? '#0a1020' : '#f6f9ff',
            border: `1px solid ${isDark ? '#1a2540' : '#dde6f5'}`,
          }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
            style={{ borderBottom: `1px solid ${isDark ? '#141e30' : '#dde6f5'}` }}>
            {selectedCamp ? (
              <>
                <button onClick={() => setSelectedCamp(null)}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: isDark ? '#4a6080' : '#7a90b8' }}
                  onMouseEnter={e => e.currentTarget.style.color = isDark ? '#94a3b8' : '#334466'}
                  onMouseLeave={e => e.currentTarget.style.color = isDark ? '#4a6080' : '#7a90b8'}>
                  <ArrowLeft size={12} /> Back
                </button>
                <span className="text-xs font-semibold truncate ml-2 max-w-[140px]"
                  style={{ color: projectColor }}>
                  {selectedCamp.title}
                </span>
              </>
            ) : (
              <h3 className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: isDark ? '#2a3a58' : '#9aabca' }}>Route Map</h3>
            )}
          </div>

          {/* Body */}
          <div className={`overflow-y-auto p-3 ${isNarrow ? '' : 'flex-1 min-h-0'}`}
            style={isNarrow ? { maxHeight: 'min(320px, 60dvh)' } : undefined}>
            {selectedCamp ? (
              // ── Camp task list ───────────────────────────────────────
              <div className="space-y-1.5">
                {campTasks.length === 0 ? (
                  <p className="text-xs text-center py-8"
                    style={{ color: isDark ? '#2a3a58' : '#9aabca' }}>
                    No tasks assigned to this milestone
                  </p>
                ) : campTasks.map(t => (
                  <div key={t.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: isDark ? '#09101e' : '#eef3ff' }}>
                    {t.status === 'done'
                      ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: projectColor }} />
                      : <Circle      size={13} className="shrink-0 mt-0.5" style={{ color: isDark ? '#2a3a58' : '#b0c0d8' }} />}
                    <span className="text-xs leading-snug"
                      style={{
                        color: t.status === 'done' ? (isDark ? '#2a3a58' : '#9aabca') : (isDark ? '#8898b8' : '#2a3a58'),
                        textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      }}>
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : camps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
                <span className="text-4xl">🏔</span>
                <p className="text-xs text-center leading-relaxed"
                  style={{ color: isDark ? '#2a3a58' : '#9aabca' }}>
                  No milestones yet.<br />Add milestones to chart your route.
                </p>
              </div>
            ) : (
              // ── Timeline camp list ───────────────────────────────────
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[18px] top-5 bottom-5 w-px"
                  style={{ backgroundColor: isDark ? '#1a2540' : '#dde6f5' }} />

                {camps.map((camp, i) => {
                  const done     = camp.done_tasks >= camp.total_tasks && camp.total_tasks > 0
                  const isActive = !done && camps.slice(0,i).every(c => c.done_tasks >= c.total_tasks && c.total_tasks > 0)
                  const isLast   = i === camps.length - 1
                  const taskPct  = camp.total_tasks ? camp.done_tasks / camp.total_tasks : 0

                  return (
                    <button key={camp.id} onClick={() => setSelectedCamp(camp)}
                      className="w-full flex items-start gap-3 px-2 py-2.5 rounded-xl text-left mb-0.5 transition-all"
                      style={{
                        backgroundColor: isActive ? `${projectColor}12` : 'transparent',
                        border: isActive ? `1px solid ${projectColor}25` : '1px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = isDark ? '#0f1825' : '#eef3ff' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}>

                      {/* Timeline node */}
                      <div className="relative z-10 w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: done
                            ? projectColor
                            : isActive
                              ? `${projectColor}20`
                              : isDark ? '#0f1825' : '#e8eeff',
                          border: done
                            ? 'none'
                            : isActive
                              ? `2px solid ${projectColor}`
                              : `2px solid ${isDark ? '#1a2540' : '#c8d4ec'}`,
                          boxShadow: isActive ? `0 0 12px ${projectColor}50` : 'none',
                        }}>
                        <span className="text-[10px] leading-none">
                          {done ? '✓' : isActive ? '🧗' : isLast ? '🏔' : i+1}
                        </span>
                      </div>

                      {/* Camp info */}
                      <div className="flex-1 min-w-0 mt-0.5">
                        <p className="text-xs font-semibold truncate leading-tight"
                          style={{
                            color: done
                              ? isDark ? '#2a3a58' : '#9aabca'
                              : isActive
                                ? isDark ? '#c8d8f0' : '#1e2d48'
                                : isDark ? '#4a6080' : '#5a7090',
                            textDecoration: done ? 'line-through' : 'none',
                          }}>
                          {camp.title}
                        </p>

                        {/* Mini progress bar */}
                        {camp.total_tasks > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex-1 h-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: isDark ? '#1a2540' : '#dde6f5' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${taskPct * 100}%`, backgroundColor: projectColor, opacity: done ? 1 : 0.7 }} />
                            </div>
                            <span className="text-[9px] shrink-0 tabular-nums"
                              style={{ color: isDark ? '#2a3a58' : '#9aabca' }}>
                              {camp.done_tasks}/{camp.total_tasks}
                            </span>
                          </div>
                        )}

                        <p className="text-[9px] mt-0.5 tabular-nums"
                          style={{ color: isDark ? '#1e3050' : '#b8cce4' }}>
                          {camp.elevation.toLocaleString()}m
                          {camp.due_date ? ` · ${camp.due_date}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Summit card ─────────────────────────────────────────────────── */}
        {allDone && (
          <div className="rounded-2xl p-4 text-center shrink-0"
            style={{
              background: `linear-gradient(135deg,${projectColor}22,${projectColor}0e)`,
              border: `1px solid ${projectColor}44`,
              boxShadow: `0 0 24px ${projectColor}1a`,
            }}>
            <div className="text-3xl mb-1.5">🏆</div>
            <p className="text-sm font-black" style={{ color: projectColor }}>Summit Reached!</p>
            <p className="text-xs mt-0.5" style={{ color: isDark ? '#4a6080' : '#8898b8' }}>
              {project.name} · {totalTasks} tasks complete
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
