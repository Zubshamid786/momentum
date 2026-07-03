import React, { useEffect, useState, useRef, useCallback } from 'react'
import { formatDuration } from '../../utils/formatTime'

const NODE_W      = 206
const NODE_H      = 76
const ROOT_W      = 236
const ROOT_H      = 116
const SUB_W       = 168
const SUB_H       = 56
const H_GAP       = 78
const V_GAP       = 22
const SUBTASK_H_GAP = 52

const STATUS_COLOR = {
  todo:        '#64748b',
  in_progress: '#3b82f6',
  blocked:     '#ef4444',
  done:        '#22c55e',
}
// Darker bottom stop for each status gradient
const STATUS_COLOR_DARK = {
  todo:        '#475569',
  in_progress: '#2563eb',
  blocked:     '#dc2626',
  done:        '#16a34a',
}

// done (green) is light — needs dark text; all others use white
function nodeTextColor(status, opacity = 0.95) {
  return status === 'done'
    ? `rgba(8,12,24,${opacity})`
    : `rgba(255,255,255,${opacity})`
}

function fmtTime(secs) {
  if (!secs) return null
  if (secs < 3600) return `${Math.round(secs / 60)}m`
  return `${(secs / 3600).toFixed(1)}h`
}

// Layout algorithm: place nodes in columns, center each group
function layout(project, tasks, subtasks) {
  const nodes = []
  const edges = []

  const rootX = 40
  nodes.push({ id: 'root', type: 'root', x: rootX, y: 0, data: project })

  const subtasksByTask = {}
  subtasks.forEach(s => {
    if (!subtasksByTask[s.task_id]) subtasksByTask[s.task_id] = []
    subtasksByTask[s.task_id].push(s)
  })

  const taskGroupHeight = tasks.map(t => {
    const subs = subtasksByTask[t.id] || []
    const taskH = NODE_H
    const subsH = subs.length > 0 ? subs.length * (SUB_H + V_GAP) - V_GAP : 0
    return Math.max(taskH, subsH > 0 ? subsH + 20 : taskH)
  })

  const totalTasksH = taskGroupHeight.reduce((s, h) => s + h + V_GAP * 2, 0) - V_GAP * 2
  const rootCenterY = totalTasksH / 2 - ROOT_H / 2
  nodes[0].y = rootCenterY

  let currentY = 0
  const taskCol = rootX + ROOT_W + H_GAP

  tasks.forEach((task, i) => {
    const groupH = taskGroupHeight[i]
    const taskY  = currentY + (groupH - NODE_H) / 2
    nodes.push({ id: `task-${task.id}`, type: 'task', x: taskCol, y: taskY, data: task })

    edges.push({
      from: { x: rootX + ROOT_W, y: rootCenterY + ROOT_H / 2 },
      to:   { x: taskCol,         y: taskY + NODE_H / 2 },
      primary: true,
    })

    const subs = subtasksByTask[task.id] || []
    if (subs.length > 0) {
      const subCol = taskCol + NODE_W + SUBTASK_H_GAP
      const subsH  = subs.length * (SUB_H + V_GAP) - V_GAP
      let subY = currentY + (groupH - subsH) / 2

      subs.forEach(sub => {
        nodes.push({ id: `sub-${sub.id}`, type: 'subtask', x: subCol, y: subY, data: sub })
        edges.push({
          from: { x: taskCol + NODE_W, y: taskY + NODE_H / 2 },
          to:   { x: subCol,           y: subY + SUB_H / 2 },
        })
        subY += SUB_H + V_GAP
      })
    }

    currentY += groupH + V_GAP * 2
  })

  const maxX = Math.max(...nodes.map(n => n.x + (n.type === 'subtask' ? SUB_W : n.type === 'root' ? ROOT_W : NODE_W))) + 40
  const maxY = Math.max(...nodes.map(n => n.y + (n.type === 'subtask' ? SUB_H : n.type === 'root' ? ROOT_H : NODE_H))) + 40

  return { nodes, edges, width: maxX, height: maxY }
}

function RootNode({ node, color, totalLogged, totalEstimate, tasksDone, tasksTotal }) {
  const { x, y, data } = node
  const pct       = totalEstimate > 0 ? Math.min(totalLogged / totalEstimate, 1) : null
  const donePct   = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const barW      = ROOT_W - 28
  const ff        = 'Inter, system-ui, -apple-system, sans-serif'

  return (
    <g filter="url(#diag-shadow-lg)">
      {/* soft outer glow */}
      <rect x={x - 2} y={y - 2} width={ROOT_W + 4} height={ROOT_H + 4} rx={18}
        fill="none" stroke={color} strokeWidth={1} opacity={0.25} />
      <rect x={x} y={y} width={ROOT_W} height={ROOT_H} rx={16}
        fill="url(#diag-root-grad)" stroke={color} strokeWidth={1.8} />
      {/* accent ribbon */}
      <rect x={x} y={y} width={ROOT_W} height={5} rx={2.5} fill={color} />

      <circle cx={x + 22} cy={y + 30} r={7} fill={color} />
      <circle cx={x + 22} cy={y + 30} r={7} fill="none" stroke={color} strokeWidth={3} opacity={0.25} />
      {/* Project name */}
      <text x={x + 38} y={y + 35} fontSize={14} fontWeight={700}
        style={{ fill: 'rgb(var(--th-text1))', fontFamily: ff }}>
        {data.name.length > 19 ? data.name.slice(0, 18) + '…' : data.name}
      </text>
      {/* Completion badge */}
      <text x={x + ROOT_W - 12} y={y + 35} fontSize={12} fontWeight={700} textAnchor="end"
        style={{ fill: donePct === 100 ? '#4ade80' : color, fontFamily: ff }}>
        {donePct}%
      </text>
      {/* Time row */}
      <text x={x + 16} y={y + 60} fontSize={10.5}
        style={{ fill: 'rgb(var(--th-text3))', fontFamily: ff }}>
        {totalLogged > 0 ? formatDuration(totalLogged) : '0m'} logged
        {totalEstimate > 0 ? ` / ${formatDuration(totalEstimate)} est.` : ''}
      </text>
      {/* Progress bar bg */}
      <rect x={x + 16} y={y + 70} width={barW} height={6} rx={3}
        style={{ fill: 'rgb(var(--th-raised))' }} />
      {pct !== null && pct > 0 && (
        <rect x={x + 16} y={y + 70} width={barW * pct} height={6} rx={3}
          fill={pct >= 1 ? '#4ade80' : color} />
      )}
      {/* Tasks done row */}
      <text x={x + 16} y={y + 95} fontSize={10.5}
        style={{ fill: 'rgb(var(--th-text4))', fontFamily: ff }}>
        {tasksDone}/{tasksTotal} tasks complete
      </text>
    </g>
  )
}

function TaskNode({ node, onClick, isSelected }) {
  const { x, y, data } = node
  const status = data.status || 'todo'
  const statusColor = STATUS_COLOR[status] || '#64748b'
  const time  = fmtTime(data.total_time)
  const pct   = data.estimate > 0 ? Math.min(data.total_time / data.estimate, 1) : null
  const title = nodeTextColor(status, 0.98)
  const sub   = nodeTextColor(status, 0.62)
  const ff    = 'Inter, system-ui, -apple-system, sans-serif'

  return (
    <g onClick={onClick} className="diag-task" style={{ cursor: 'pointer' }} filter="url(#diag-shadow)">
      {isSelected && (
        <rect x={x - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx={14}
          fill="none" stroke="#fff" strokeWidth={2} opacity={0.9} />
      )}
      {/* gradient fill by status */}
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={12}
        fill={`url(#diag-grad-${status})`} />
      {/* glossy top highlight */}
      <rect x={x} y={y} width={NODE_W} height={NODE_H / 2} rx={12}
        fill="url(#diag-gloss)" opacity={0.16} />

      {/* Title */}
      <text x={x + 15} y={y + 24} fontSize={12.5} fontWeight={650}
        style={{ fill: title, fontFamily: ff }}>
        {data.title.length > 22 ? data.title.slice(0, 21) + '…' : data.title}
      </text>
      {/* Time / subtask count */}
      {time && (
        <text x={x + 15} y={y + 41} fontSize={10.5}
          style={{ fill: sub, fontFamily: ff }}>
          ⏱ {time}{data.subtask_count > 0 ? `  ·  ✓ ${data.subtask_done}/${data.subtask_count}` : ''}
        </text>
      )}
      {!time && data.subtask_count > 0 && (
        <text x={x + 15} y={y + 41} fontSize={10.5}
          style={{ fill: sub, fontFamily: ff }}>
          ✓ {data.subtask_done}/{data.subtask_count} subtasks
        </text>
      )}
      {/* Progress bar */}
      {pct !== null && (
        <>
          <rect x={x + 15} y={y + 54} width={NODE_W - 26} height={5} rx={2.5}
            fill={status === 'done' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.22)'} />
          <rect x={x + 15} y={y + 54} width={(NODE_W - 26) * pct} height={5} rx={2.5}
            fill={status === 'done' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)'} />
        </>
      )}
      {/* Icon */}
      {data.icon && (
        <text x={x + NODE_W - 18} y={y + 24} fontSize={14} textAnchor="middle">{data.icon}</text>
      )}
    </g>
  )
}

function SubtaskNode({ node }) {
  const { x, y, data } = node
  const ff = 'Inter, system-ui, -apple-system, sans-serif'
  return (
    <g filter="url(#diag-shadow-sm)">
      <rect x={x} y={y} width={SUB_W} height={SUB_H} rx={10}
        style={{
          fill: data.done ? 'rgb(var(--th-raised))' : 'rgb(var(--th-card))',
          stroke: data.done ? 'rgb(var(--th-border))' : '#6366f155',
          strokeWidth: 1,
          strokeDasharray: data.done ? '0' : '4 3',
        }} />
      {/* Checkbox */}
      <rect x={x + 11} y={y + SUB_H/2 - 7} width={15} height={15} rx={4}
        style={{
          fill: data.done ? '#6366f1' : 'transparent',
          stroke: data.done ? '#6366f1' : 'rgb(var(--th-border))',
          strokeWidth: 1.5,
        }} />
      {data.done && (
        <path d={`M${x+15} ${y+SUB_H/2} l3 3 6-6`} stroke="white" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      )}
      <text x={x + 34} y={y + SUB_H/2 + 4} fontSize={11}
        style={{
          fill: data.done ? 'rgb(var(--th-text5))' : 'rgb(var(--th-text2))',
          fontFamily: ff,
          textDecoration: data.done ? 'line-through' : 'none',
        }}>
        {data.title.length > 16 ? data.title.slice(0, 15) + '…' : data.title}
      </text>
      {data.estimate > 0 && (
        <text x={x + SUB_W - 8} y={y + SUB_H/2 + 4} fontSize={9} textAnchor="end"
          style={{ fill: 'rgb(var(--th-text5))', fontFamily: ff }}>
          {data.estimate < 60 ? `${data.estimate}m` : `${(data.estimate/60).toFixed(0)}h`}
        </text>
      )}
    </g>
  )
}

function Edge({ edge, color }) {
  const { from, to, primary } = edge
  const mx = (from.x + to.x) / 2
  const d  = `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`
  const stroke = primary ? color : 'rgb(var(--th-border))'
  return (
    <g>
      <path d={d} fill="none" stroke={stroke} strokeWidth={primary ? 2 : 1.5}
        opacity={primary ? 0.5 : 0.55} strokeLinecap="round" />
      {/* connection dots */}
      <circle cx={from.x} cy={from.y} r={2.5} fill={stroke} opacity={primary ? 0.7 : 0.5} />
      <circle cx={to.x}   cy={to.y}   r={2.5} fill={stroke} opacity={primary ? 0.7 : 0.5} />
    </g>
  )
}

export default function ProjectDiagram({ projectId, projectColor }) {
  const [diagramData, setDiagramData] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [scale, setScale]   = useState(1)
  const [offset, setOffset] = useState({ x: 40, y: 40 })
  const svgRef = useRef(null)
  const isPanning = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })

  const load = useCallback(async () => {
    const data = await window.api.getProjectDiagram(projectId)
    setDiagramData(data)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const { nodes, edges, width, height } = diagramData
    ? layout(diagramData.project, diagramData.tasks, diagramData.subtasks)
    : { nodes: [], edges: [], width: 800, height: 500 }

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.min(Math.max(s * delta, 0.3), 2.5))
  }
  function handleMouseDown(e) {
    if (e.button !== 0) return
    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  function handleMouseMove(e) {
    if (!isPanning.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }
  function handleMouseUp() { isPanning.current = false }

  const totalLogged   = diagramData?.tasks?.reduce((s, t) => s + (t.total_time || 0), 0) || 0
  const totalEstimate = diagramData?.tasks?.reduce((s, t) => s + (t.estimate || 0), 0) || 0
  const tasksDone     = diagramData?.tasks?.filter(t => t.status === 'done').length || 0
  const tasksTotal    = diagramData?.tasks?.length || 0

  if (!diagramData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (diagramData.tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-th-text5 text-sm">
        No tasks in this project yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Legend + stats */}
      <div className="flex items-center gap-6 mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize"
              style={{ backgroundColor: color + '1f', color }}>
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
              {status.replace('_', ' ')}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-th-text4">
          {totalLogged > 0 && <span className="font-medium text-th-text2">Logged: {formatDuration(totalLogged)}</span>}
          {totalEstimate > 0 && <span>/ Est: {formatDuration(totalEstimate)}</span>}
          <span className="hidden sm:inline">Scroll to zoom · Drag to pan</span>
        </div>
      </div>

      {/* SVG canvas */}
      <div
        className="flex-1 rounded-xl border border-th-border overflow-hidden relative"
        style={{
          cursor: isPanning.current ? 'grabbing' : 'grab', minHeight: 400,
          background: 'radial-gradient(circle at 30% 20%, rgb(var(--th-raised)/0.35), rgb(var(--th-bg)/0.6))',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            {/* status gradients */}
            {Object.keys(STATUS_COLOR).map(s => (
              <linearGradient key={s} id={`diag-grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={STATUS_COLOR[s]} />
                <stop offset="100%" stopColor={STATUS_COLOR_DARK[s]} />
              </linearGradient>
            ))}
            <linearGradient id="diag-root-grad" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%"   stopColor="rgb(var(--th-card))" />
              <stop offset="100%" stopColor="rgb(var(--th-surface))" />
            </linearGradient>
            <linearGradient id="diag-gloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <filter id="diag-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
            </filter>
            <filter id="diag-shadow-lg" x="-40%" y="-40%" width="180%" height="190%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#000000" floodOpacity="0.40" />
            </filter>
            <filter id="diag-shadow-sm" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
            <pattern id="diag-grid" width={44} height={44} patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 44" fill="none" style={{ stroke: 'rgb(var(--th-border))' }} strokeWidth={0.5} opacity={0.4} />
            </pattern>
          </defs>

          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
            <rect x={-1000} y={-1000} width={width + 2000} height={height + 2000} fill="url(#diag-grid)" />

            {/* Edges */}
            {edges.map((edge, i) => <Edge key={i} edge={edge} color={projectColor} />)}

            {/* Nodes */}
            {nodes.map(node => {
              if (node.type === 'root')    return <RootNode    key={node.id} node={node} color={projectColor} totalLogged={totalLogged} totalEstimate={totalEstimate} tasksDone={tasksDone} tasksTotal={tasksTotal} />
              if (node.type === 'task')    return <TaskNode    key={node.id} node={node}
                isSelected={selectedTask?.id === node.data.id}
                onClick={() => setSelectedTask(node.data.id === selectedTask?.id ? null : node.data)} />
              if (node.type === 'subtask') return <SubtaskNode key={node.id} node={node} />
              return null
            })}
          </g>
        </svg>

        {/* Reset button */}
        <button
          onClick={() => { setScale(1); setOffset({ x: 40, y: 40 }) }}
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-th-card/90 border border-th-border text-xs text-th-text3 hover:text-th-text1 transition-colors shadow-sm backdrop-blur-sm"
        >
          Reset view
        </button>

        {/* Selected task tooltip */}
        {selectedTask && (
          <div className="absolute top-4 right-4 glass card-shadow rounded-xl p-4 w-60 border border-th-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[selectedTask.status] }} />
              <p className="text-sm font-semibold text-th-text1 flex-1 truncate">{selectedTask.icon} {selectedTask.title}</p>
            </div>
            <p className="text-xs text-th-text4 mb-2 capitalize">{selectedTask.status?.replace('_', ' ')} · {selectedTask.priority}</p>
            {selectedTask.total_time > 0 && <p className="text-xs text-th-text3">Time: {formatDuration(selectedTask.total_time)}</p>}
            {selectedTask.estimate > 0 && <p className="text-xs text-th-text3">Estimate: {formatDuration(selectedTask.estimate)}</p>}
            {selectedTask.subtask_count > 0 && (
              <p className="text-xs text-th-text3">Subtasks: {selectedTask.subtask_done}/{selectedTask.subtask_count}</p>
            )}
            <button onClick={() => setSelectedTask(null)} className="mt-2.5 text-xs text-th-text5 hover:text-th-text3">Dismiss</button>
          </div>
        )}
      </div>
    </div>
  )
}
