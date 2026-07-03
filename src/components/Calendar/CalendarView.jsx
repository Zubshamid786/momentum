import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, ChevronDown, Check, ListChecks } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDuration, isOverdue } from '../../utils/formatTime'
import TaskDetail from '../Projects/TaskDetail'

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const BAR_H = 20

// ── Date helpers ───────────────────────────────────────────────────────────────
function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayStr() { return localDateStr(new Date()) }

function getMondayOfWeek(date) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)
}

function formatHeader(date, view) {
  if (view === 'month' || view === 'timeline')
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
  if (view === 'week') {
    const mon = getMondayOfWeek(date)
    const sun = addDays(mon, 6)
    if (mon.getMonth() === sun.getMonth())
      return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}–${sun.getDate()}, ${mon.getFullYear()}`
    return `${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()} – ${MONTH_NAMES[sun.getMonth()]} ${sun.getDate()}, ${sun.getFullYear()}`
  }
  return `${DAY_NAMES[(date.getDay() + 6) % 7]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// ── Task date helpers ──────────────────────────────────────────────────────────
function taskRange(task) {
  const start = task.start_date || task.due_date
  const end   = task.due_date   || task.start_date
  return { start, end }
}

function taskOverlapsRange(task, rangeStart, rangeEnd) {
  const { start, end } = taskRange(task)
  if (!start || !end) return false
  return start <= rangeEnd && end >= rangeStart
}


// ── Daily task pill (used in Month + Week) ─────────────────────────────────────
function DailyPill({ task, onClick, compact = false }) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done'
  const color   = overdue ? '#ef4444' : task.project_color
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(task) }}
      title={task.title}
      className="w-full text-left flex items-center gap-1 px-1.5 rounded-md overflow-hidden hover:opacity-90 transition-all"
      style={{
        height:          `${BAR_H}px`,
        backgroundColor: color + 'cc',
      }}
    >
      {task.icon && <span className="text-xs leading-none shrink-0">{task.icon}</span>}
      {!compact && (
        <span className="text-xs font-medium truncate leading-none" style={{ color: '#fff' }}>
          {task.title}
        </span>
      )}
    </button>
  )
}

// ── Month view (daily cells with stacked pills) ────────────────────────────────
function GanttMonthView({ currentDate, tasks, onSelectTask, onSelectDay }) {
  const today  = todayStr()
  const year   = currentDate.getFullYear()
  const month  = currentDate.getMonth()

  const weeks = useMemo(() => {
    const firstDay    = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const startDate   = addDays(firstDay, -startOffset)
    return Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(startDate, w * 7 + i)
        return { date: d, str: localDateStr(d), isCurrentMonth: d.getMonth() === month }
      })
    )
  }, [year, month])

  // For each day string, which tasks are active
  const tasksByDay = useMemo(() => {
    const map = {}
    // Collect every day string across all 6 weeks
    weeks.forEach(days => days.forEach(({ str }) => {
      map[str] = tasks.filter(t => {
        const { start, end } = taskRange(t)
        if (!start || !end) return false
        return start <= str && end >= str
      })
    }))
    return map
  }, [weeks, tasks])

  return (
    <div className="flex-1 overflow-auto">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-th-border sticky top-0 z-20 bg-th-surface/90 backdrop-blur-sm">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-xs font-semibold text-th-text4 uppercase tracking-wider text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
        {weeks.flat().map(({ date, str, isCurrentMonth }, i) => {
          const isToday   = str === today
          const isWeekend = i % 7 >= 5
          const dayTasks  = tasksByDay[str] || []
          const visible   = dayTasks.slice(0, 4)
          const overflow  = dayTasks.length - 4

          return (
            <div
              key={str}
              onClick={() => onSelectDay(date)}
              className={`border-b border-r border-th-border/40 p-1 cursor-pointer hover:bg-th-raised/20 transition-colors ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isWeekend && isCurrentMonth ? 'bg-th-raised/5' : ''} ${i % 7 === 0 ? 'border-l border-th-border/40' : ''}`}
            >
              <div className="flex justify-center mb-1">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? 'bg-brand-500 text-white' : !isCurrentMonth ? 'text-th-text5' : 'text-th-text3'
                }`}>
                  {date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {visible.map(task => (
                  <DailyPill key={task.id} task={task} onClick={onSelectTask} />
                ))}
                {overflow > 0 && (
                  <p className="text-xs text-th-text5 pl-1">+{overflow} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view (daily columns with stacked pills) ───────────────────────────────
function GanttWeekView({ currentDate, tasks, onSelectTask, onSelectDay }) {
  const today  = todayStr()
  // Memoize monday as a stable Date reference — prevents useEffect/useMemo from
  // re-running on every render due to new Date() object reference inequality
  const monday    = useMemo(() => getMondayOfWeek(currentDate), [currentDate])
  const mondayStr = useMemo(() => localDateStr(monday), [monday])
  const [weekStats, setWeekStats] = useState(null)

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i)
      return { date: d, str: localDateStr(d) }
    }),
  [monday])

  // Fetch actual logged time + planned block time for each day of the week.
  // Depend on mondayStr (a string) not monday (a Date) — strings compare by value,
  // so this only re-fires when the displayed week actually changes.
  useEffect(() => {
    const from     = mondayStr
    const to       = localDateStr(addDays(monday, 6))
    const tzOffset = -new Date().getTimezoneOffset()
    Promise.all([
      window.api.getChartData({ from, to, tzOffset }),
      Promise.all(days.map(d =>
        window.api.getTimeBlocks(d.str).then(blocks => ({
          str: d.str,
          plannedSecs: (blocks || []).reduce((sum, b) => {
            const sh = parseInt(b.start_time.slice(11, 13)) + parseInt(b.start_time.slice(14, 16)) / 60
            const eh = parseInt(b.end_time.slice(11, 13))   + parseInt(b.end_time.slice(14, 16))   / 60
            return sum + Math.max(0, eh - sh) * 3600
          }, 0),
        }))
      )),
    ]).then(([actualData, plannedData]) => {
      const actualMap = {}
      actualData.forEach(d => { actualMap[d.day] = d.total })
      setWeekStats(days.map((d, i) => ({
        actualSecs:  actualMap[d.str] || 0,
        plannedSecs: plannedData[i]?.plannedSecs || 0,
      })))
    })
  }, [mondayStr]) // eslint-disable-line

  const tasksByDay = useMemo(() => {
    const map = {}
    days.forEach(({ str }) => {
      map[str] = tasks.filter(t => {
        const { start, end } = taskRange(t)
        if (!start || !end) return false
        return start <= str && end >= str
      })
    })
    return map
  }, [days, tasks])

  const unscheduled = useMemo(() =>
    tasks.filter(t => { const { start, end } = taskRange(t); return !start && !end && t.status !== 'done' }),
  [tasks])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-h-full divide-x divide-th-border/40" style={{ minWidth: '560px' }}>
          {days.map(({ date, str }, di) => {
            const isToday  = str === today
            const isPast   = str < today
            const dayTasks = tasksByDay[str] || []

            return (
              <div key={str} className={`flex flex-col min-h-[480px] ${isToday ? 'bg-brand-500/4' : di >= 5 ? 'bg-th-raised/5' : ''}`}>
                {/* Day header */}
                <div className={`px-2 py-2 border-b border-th-border/40 text-center sticky top-0 z-10 backdrop-blur-sm ${isToday ? 'bg-brand-500/10' : 'bg-th-surface/90'}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-brand-400' : 'text-th-text4'}`}>{DAY_NAMES[di]}</p>
                  <button
                    onClick={() => onSelectDay?.(date)}
                    title="Open day view"
                    className={`w-7 h-7 flex items-center justify-center rounded-full mx-auto mt-0.5 text-sm font-bold transition-colors ${
                      isToday ? 'bg-brand-500 text-white' : isPast ? 'text-th-text5 hover:bg-th-raised hover:text-th-text2' : 'text-th-text1 hover:bg-th-raised'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                  {/* Planned vs Actual chips */}
                  {weekStats?.[di] && (weekStats[di].actualSecs > 0 || weekStats[di].plannedSecs > 0) && (
                    <div className="flex flex-col items-center gap-0.5 mt-1.5">
                      {weekStats[di].actualSecs > 0 && (
                        <span className="text-[9px] font-semibold text-green-400 leading-none">
                          ✓ {formatDuration(weekStats[di].actualSecs)}
                        </span>
                      )}
                      {weekStats[di].plannedSecs > 0 && (
                        <span className="text-[9px] font-semibold text-brand-400/70 leading-none">
                          ◷ {formatDuration(weekStats[di].plannedSecs)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Task pills */}
                <div className="flex-1 p-1.5 space-y-1">
                  {dayTasks.length === 0 ? (
                    <div className="h-full flex items-start justify-center pt-6">
                      <span className="text-xs text-th-text5">—</span>
                    </div>
                  ) : (
                    dayTasks.map(task => (
                      <DailyPill key={task.id} task={task} onClick={onSelectTask} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled sidebar — hidden on mobile */}
      {unscheduled.length > 0 && (
        <div className="hidden md:flex w-52 shrink-0 border-l border-th-border flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-th-border">
            <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Unscheduled</p>
            <p className="text-xs text-th-text5 mt-0.5">{unscheduled.length} task{unscheduled.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {unscheduled.map(task => <MiniTaskCard key={task.id} task={task} onClick={onSelectTask} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Day view with time grid ────────────────────────────────────────────────────
const GRID_START = 6   // 6am
const GRID_END   = 23  // 11pm
const HOUR_H     = 56  // px per hour

function DayView({ currentDate, tasks, onSelectTask }) {
  const today   = todayStr()
  const str     = localDateStr(currentDate)
  const isToday = str === today

  const [schedule,    setSchedule]    = useState([])
  const [timeBlocks,  setTimeBlocks]  = useState([])
  const [newBlock,    setNewBlock]    = useState(null)
  const [blockLabel,  setBlockLabel]  = useState('')
  const [blockTaskId, setBlockTaskId] = useState('')   // '' = no task, else task id string
  const [subtaskMap,  setSubtaskMap]  = useState({})   // { taskId: subtask[] }
  const [expanded,    setExpanded]    = useState({})   // { taskId: bool }
  const [drag,           setDrag]           = useState(null)  // { blockId, type, startY, origStartH, origEndH }
  const [dragPreview,    setDragPreview]    = useState(null)  // { blockId, startH, endH }
  const [hoveredBlockId, setHoveredBlockId] = useState(null)
  // dragRef mirrors drag state for use in async pointer handlers (no stale closure)
  const dragRef        = useRef(null)
  const dragPreviewRef = useRef(null)
  const gridRef        = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { dragRef.current = drag }, [drag])
  useEffect(() => { dragPreviewRef.current = dragPreview }, [dragPreview])

  const loadData = useCallback(() => {
    window.api.getDaySchedule(str).then(data => setSchedule(data || []))
    window.api.getTimeBlocks(str).then(data => setTimeBlocks(data || []))
  }, [str])

  useEffect(() => { loadData() }, [loadData])

  function blockToHours(block) {
    const sh = parseInt(block.start_time.slice(11, 13)) + parseInt(block.start_time.slice(14, 16)) / 60
    const eh = parseInt(block.end_time.slice(11, 13))   + parseInt(block.end_time.slice(14, 16))   / 60
    return { sh, eh }
  }

  function snapTo15(h) { return Math.round(h * 4) / 4 }

  // ── Pointer-capture drag handlers (work reliably in Electron) ─────────────
  // Called from both the block body (move) and the resize handle (resize)
  function onBlockPointerDown(e, block, type) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)   // all future events route here
    const { sh, eh } = blockToHours(block)
    const dragState = { blockId: block.id, type, startY: e.clientY, origStartH: sh, origEndH: eh }
    dragRef.current = dragState
    setDrag(dragState)
    const preview = { blockId: block.id, startH: sh, endH: eh }
    dragPreviewRef.current = preview
    setDragPreview(preview)
  }

  function onBlockPointerMove(e, blockId) {
    const d = dragRef.current
    if (!d || d.blockId !== blockId) return
    e.preventDefault()
    const dh = (e.clientY - d.startY) / HOUR_H
    let preview
    if (d.type === 'move') {
      const dur  = d.origEndH - d.origStartH
      const newS = snapTo15(Math.max(GRID_START, Math.min(d.origStartH + dh, GRID_END - dur)))
      preview = { blockId: d.blockId, startH: newS, endH: newS + dur }
    } else {
      const newE = snapTo15(Math.max(d.origStartH + 0.25, Math.min(d.origEndH + dh, GRID_END)))
      preview = { blockId: d.blockId, startH: d.origStartH, endH: newE }
    }
    dragPreviewRef.current = preview
    setDragPreview(preview)
  }

  async function onBlockPointerUp(e, blockId) {
    const d = dragRef.current
    if (!d || d.blockId !== blockId) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
    const preview = dragPreviewRef.current
    if (preview) {
      const startTime = `${str}T${fmtHHMM(preview.startH)}:00`
      const endTime   = `${str}T${fmtHHMM(preview.endH)}:00`
      await window.api.updateTimeBlock(blockId, { start_time: startTime, end_time: endTime })
      loadData()
    }
    dragRef.current     = null
    dragPreviewRef.current = null
    setDrag(null)
    setDragPreview(null)
  }

  function onBlockPointerCancel(e, blockId) {
    const d = dragRef.current
    if (!d || d.blockId !== blockId) return
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (_) {}
    dragRef.current     = null
    dragPreviewRef.current = null
    setDrag(null)
    setDragPreview(null)
  }

  const activeTasks = useMemo(() => tasks
    .filter(t => {
      const { start, end } = taskRange(t)
      if (!start || !end) return false
      return start <= str && end >= str
    })
    .sort((a, b) => {
      // Sort by start_time first, fall back to due_time; tasks with neither sink to bottom
      const aTime = a.start_time || a.due_time
      const bTime = b.start_time || b.due_time
      if (!aTime && !bTime) return 0
      if (!aTime) return 1
      if (!bTime) return -1
      return aTime.localeCompare(bTime)
    }),
  [tasks, str])

  // Tasks with start_time or due_time → shown as positioned blocks in the planned lane
  const scheduledTasks = useMemo(() =>
    activeTasks.filter(t =>
      (t.due_time  && /^\d{2}:\d{2}/.test(t.due_time)) ||
      (t.start_time && /^\d{2}:\d{2}/.test(t.start_time))
    ),
  [activeTasks])

  // Load subtasks for all active tasks whenever activeTasks changes
  useEffect(() => {
    if (!activeTasks.length) { setSubtaskMap({}); return }
    Promise.all(activeTasks.map(t => window.api.getSubtasks(t.id).then(subs => ({ taskId: t.id, subs: subs || [] }))))
      .then(results => {
        const map = {}
        results.forEach(({ taskId, subs }) => { map[taskId] = subs })
        setSubtaskMap(map)
      })
  }, [activeTasks])

  const unscheduled = useMemo(() =>
    tasks.filter(t => { const { start, end } = taskRange(t); return !start && !end && t.status !== 'done' }),
  [tasks])

  // Total planned hours per task from task-linked time blocks
  const plannedByTask = useMemo(() => {
    const map = {}
    timeBlocks.forEach(block => {
      if (!block.task_id) return
      const sh = parseInt(block.start_time.slice(11, 13)) + parseInt(block.start_time.slice(14, 16)) / 60
      const eh = parseInt(block.end_time.slice(11, 13))   + parseInt(block.end_time.slice(14, 16))   / 60
      map[block.task_id] = (map[block.task_id] || 0) + Math.max(0, eh - sh)
    })
    return map
  }, [timeBlocks])

  const hours = Array.from({ length: GRID_END - GRID_START + 1 }, (_, i) => GRID_START + i)

  function entryToBlock(entry) {
    const start  = new Date(entry.start_time)
    const end    = new Date(entry.end_time)
    const startH = start.getHours() + start.getMinutes() / 60
    const endH   = end.getHours()   + end.getMinutes()   / 60
    const top    = (Math.max(startH, GRID_START) - GRID_START) * HOUR_H
    const height = Math.max((Math.min(endH, GRID_END) - Math.max(startH, GRID_START)) * HOUR_H, 20)
    return { top, height, startH, endH }
  }

  // Merge same-task entries that have a gap < 10 minutes between them into one visual block
  function mergeEntries(entries) {
    const GAP = 10 * 60 * 1000 // 10 minutes in ms
    const sorted = [...entries].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    const merged = []
    for (const entry of sorted) {
      const last = merged[merged.length - 1]
      const isSameTask = last && last.task_id === entry.task_id
      const isClose    = last && (new Date(entry.start_time) - new Date(last.end_time)) < GAP
      if (isSameTask && isClose) {
        // Extend the last block: use the later end_time, accumulate duration
        last.end_time = entry.end_time > last.end_time ? entry.end_time : last.end_time
        last.duration = (last.duration || 0) + (entry.duration || 0)
      } else {
        merged.push({ ...entry })
      }
    }
    return merged
  }

  // Assign non-overlapping columns to time entries so they sit side-by-side
  function layoutEntries(entries) {
    const sorted = [...entries].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    const colEnds = [] // tracks the end time of the last entry in each column
    const items = sorted.map(entry => {
      const start = new Date(entry.start_time).getTime()
      const end   = new Date(entry.end_time).getTime()
      let col = 0
      while (colEnds[col] !== undefined && colEnds[col] > start) col++
      colEnds[col] = end
      return { entry, col }
    })
    // totalCols = max columns needed across any overlapping group
    items.forEach(item => {
      const start = new Date(item.entry.start_time).getTime()
      const end   = new Date(item.entry.end_time).getTime()
      let maxCol  = item.col
      items.forEach(other => {
        const os = new Date(other.entry.start_time).getTime()
        const oe = new Date(other.entry.end_time).getTime()
        if (os < end && oe > start) maxCol = Math.max(maxCol, other.col)
      })
      item.totalCols = maxCol + 1
    })
    return items
  }

  function fmtTime(h) {
    const hour = Math.floor(h)
    const min  = Math.round((h - hour) * 60)
    const ampm = hour >= 12 ? 'pm' : 'am'
    return `${hour > 12 ? hour - 12 : hour || 12}${min ? ':' + String(min).padStart(2, '0') : ''}${ampm}`
  }

  function fmtHHMM(h) {
    const hour = Math.floor(h)
    const min  = Math.round((h - hour) * 60)
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  function snapToHalfHour(h) {
    return Math.round(h * 2) / 2
  }

  function handleGridClick(e) {
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const y    = e.clientY - rect.top
    const rawH = GRID_START + y / HOUR_H
    const startH = snapToHalfHour(Math.max(GRID_START, Math.min(rawH, GRID_END - 0.5)))
    const endH   = Math.min(startH + 1, GRID_END)
    setNewBlock({ startH, endH })
    setBlockLabel('')
    setBlockTaskId('')
  }

  async function handleSaveBlock() {
    if (!newBlock) return
    const linkedTask = blockTaskId ? activeTasks.find(t => String(t.id) === blockTaskId) : null
    const label = blockLabel.trim() || (linkedTask ? linkedTask.title : '')
    if (!label) return
    const date      = str
    const startTime = `${date}T${fmtHHMM(newBlock.startH)}:00`
    const endTime   = `${date}T${fmtHHMM(newBlock.endH)}:00`
    await window.api.createTimeBlock({
      date,
      label,
      start_time: startTime,
      end_time:   endTime,
      task_id:    linkedTask ? linkedTask.id : null,
    })
    setNewBlock(null)
    setBlockLabel('')
    setBlockTaskId('')
    loadData()
  }

  async function handleDeleteBlock(id) {
    await window.api.deleteTimeBlock(id)
    loadData()
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left: time grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Day header */}
        <div className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-th-border sticky top-0 z-10 backdrop-blur-sm ${isToday ? 'bg-brand-500/5' : 'bg-th-surface/90'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
            isToday ? 'bg-brand-500 text-white' : 'bg-th-card border border-th-border text-th-text1'
          }`}>
            {currentDate.getDate()}
          </div>
          <div>
            <p className="text-base font-bold text-th-text1">
              {DAY_NAMES[(currentDate.getDay() + 6) % 7]}, {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getDate()}
            </p>
            <p className="text-xs text-th-text4">
              {isToday ? 'Today · ' : ''}{schedule.length} session{schedule.length !== 1 ? 's' : ''} · {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} active
              {(timeBlocks.length > 0 || scheduledTasks.length > 0) && ` · ${timeBlocks.length + scheduledTasks.length} planned`}
            </p>
          </div>
          <p className="hidden sm:block ml-auto text-xs text-th-text4 bg-th-raised border border-th-border rounded-lg px-2.5 py-1">
            ✦ Click grid to plan a time block
          </p>
        </div>

        {/* All-day tasks strip — tasks that span this day shown as coloured bars */}
        {activeTasks.length > 0 && (
          <div className="border-b border-th-border/60 bg-th-surface/60 px-4 py-2">
            <div className="flex gap-2">
              {/* Align with the hour-label column */}
              <div className="w-14 shrink-0 flex items-center">
                <span className="text-xs text-th-text5 font-mono">All day</span>
              </div>
              <div className="flex-1 space-y-1">
                {activeTasks.map(task => {
                  const done = task.status === 'done'
                  return (
                    <button
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      title={task.title}
                      className="w-full flex items-center gap-1.5 px-2.5 py-1 rounded-md text-left hover:opacity-85 transition-opacity overflow-hidden"
                      style={{ backgroundColor: task.project_color + (done ? '55' : 'dd') }}
                    >
                      {done
                        ? <span className="text-xs leading-none shrink-0">✓</span>
                        : task.icon && <span className="text-xs leading-none shrink-0">{task.icon}</span>
                      }
                      <span className={`text-xs font-medium truncate ${done ? 'line-through text-white/50' : 'text-white'}`}>
                        {task.title}
                      </span>
                      <span className="text-xs text-white/65 ml-auto shrink-0 hidden sm:block">{task.project_name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Lane labels — shown when there's data in either lane */}
        {(schedule.length > 0 || timeBlocks.length > 0 || scheduledTasks.length > 0) && (
          <div className="flex items-center px-4 py-1.5 border-b border-th-border/20 bg-th-surface/40">
            <div className="w-14 shrink-0" />
            <div className="flex-1 flex text-[9px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5" style={{ width: '52%' }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(34,197,94,0.55)' }} />
                <span className="text-th-text5">Actual logged</span>
              </div>
              {(timeBlocks.length > 0 || scheduledTasks.length > 0) && (
                <div className="flex items-center gap-1.5" style={{ width: '46%' }}>
                  <span className="w-2 h-2 rounded-sm inline-block border border-dashed" style={{ backgroundColor: 'rgba(99,102,241,0.25)', borderColor: 'rgba(99,102,241,0.6)' }} />
                  <span className="text-th-text5">Planned</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hourly grid */}
        <div className="flex px-4 pb-6 pt-2">
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative" style={{ height: `${(GRID_END - GRID_START + 1) * HOUR_H}px` }}>
            {hours.map(h => (
              <div key={h} className="absolute right-3 text-xs text-th-text5 font-mono -translate-y-2"
                style={{ top: (h - GRID_START) * HOUR_H }}>
                {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
              </div>
            ))}
          </div>

          {/* Grid + blocks */}
          <div
            ref={gridRef}
            onClick={handleGridClick}
            className="flex-1 relative border-l border-th-border/40 cursor-crosshair"
            style={{ height: `${(GRID_END - GRID_START + 1) * HOUR_H}px` }}
          >
            {/* Hour lines */}
            {hours.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-th-border/30"
                style={{ top: (h - GRID_START) * HOUR_H }} />
            ))}
            {/* Half-hour lines */}
            {hours.map(h => (
              <div key={`${h}.5`} className="absolute left-0 right-0 border-t border-th-border/15"
                style={{ top: (h - GRID_START + 0.5) * HOUR_H }} />
            ))}
            {/* Lane divider — separates actual (left) from planned (right) */}
            {(timeBlocks.length > 0 || scheduledTasks.length > 0) && (
              <div className="absolute top-0 bottom-0 border-l border-dashed border-th-border/40 pointer-events-none"
                style={{ left: '53%' }} />
            )}

            {/* Current time indicator */}
            {isToday && (() => {
              const now = new Date()
              const nowH = now.getHours() + now.getMinutes() / 60
              if (nowH < GRID_START || nowH > GRID_END) return null
              return (
                <div className="absolute left-0 right-0 flex items-center gap-1 z-20 pointer-events-none"
                  style={{ top: (nowH - GRID_START) * HOUR_H }}>
                  <div className="w-2 h-2 rounded-full bg-red-400 -ml-1 shrink-0" />
                  <div className="flex-1 h-px bg-red-400" />
                </div>
              )
            })()}

            {/* Time block planned slots — draggable, resizable */}
            {timeBlocks.map(block => {
              const isDragging = drag?.blockId === block.id
              // Use dragPreview STATE (not ref) here so re-renders fire during drag
              const preview    = isDragging ? dragPreview : null
              const { sh: rawSh, eh: rawEh } = blockToHours(block)
              const sh = preview ? preview.startH : rawSh
              const eh = preview ? preview.endH   : rawEh

              const top      = (Math.max(sh, GRID_START) - GRID_START) * HOUR_H
              const height   = Math.max((Math.min(eh, GRID_END) - Math.max(sh, GRID_START)) * HOUR_H, 28)
              const linked   = !!block.task_id
              const color    = linked ? block.project_color : '#6366f1'
              const isHovered = hoveredBlockId === block.id

              return (
                <div
                  key={block.id}
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={() => setHoveredBlockId(block.id)}
                  onMouseLeave={() => setHoveredBlockId(prev => prev === block.id ? null : prev)}
                  onPointerDown={e  => onBlockPointerDown(e, block, 'move')}
                  onPointerMove={e  => onBlockPointerMove(e, block.id)}
                  onPointerUp={e    => onBlockPointerUp(e, block.id)}
                  onPointerCancel={e => onBlockPointerCancel(e, block.id)}
                  style={{
                    position:        'absolute',
                    left:            '54%',
                    right:           2,
                    top,
                    height,
                    border:          linked ? `1.5px solid ${color}99` : '1.5px dashed #6366f155',
                    borderRadius:    6,
                    backgroundColor: linked ? color + 'bb' : '#6366f110',
                    zIndex:          isDragging ? 30 : 20,
                    cursor:          isDragging ? 'grabbing' : 'grab',
                    userSelect:      'none',
                    touchAction:     'none',   // required for pointer capture to work
                    opacity:         isDragging ? 0.85 : 1,
                    overflow:        'visible',
                  }}
                >
                  {/* Content — clipped inside the block */}
                  <div style={{ display:'flex', flexDirection:'column', justifyContent:'center',
                    padding:'0 8px', height:'100%', overflow:'hidden', pointerEvents:'none' }}>
                    {linked ? (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:4, overflow:'hidden' }}>
                          {block.task_icon && <span style={{ fontSize:11, lineHeight:1, flexShrink:0 }}>{block.task_icon}</span>}
                          <span style={{ fontSize:11, fontWeight:500, color:'#fff', overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
                            {block.task_title || block.label}
                          </span>
                        </div>
                        {height > 36 && (
                          <span style={{ fontSize:10, marginTop:2, color:'rgba(255,255,255,0.7)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {fmtTime(sh)} – {fmtTime(eh)}
                          </span>
                        )}
                      </>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:11, color:'#818cf8', overflow:'hidden',
                          textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{block.label}</span>
                        {height > 32 && (
                          <span style={{ fontSize:10, color:'#818cf866', flexShrink:0 }}>
                            {fmtTime(sh)}–{fmtTime(eh)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button — visible on hover via React state */}
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); handleDeleteBlock(block.id) }}
                    title="Remove block"
                    style={{
                      position:       'absolute',
                      top:            3,
                      right:          3,
                      width:          18,
                      height:         18,
                      borderRadius:   4,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      opacity:        isHovered ? 1 : 0,
                      transition:     'opacity 0.12s',
                      color:          linked ? '#fff' : '#818cf8',
                      background:     'rgba(0,0,0,0.3)',
                      fontSize:       11,
                      cursor:         'pointer',
                      border:         'none',
                      zIndex:         25,
                    }}
                  >✕</button>

                  {/* Resize handle — bottom edge, visible on hover */}
                  <div
                    onPointerDown={e => onBlockPointerDown(e, block, 'resize')}
                    onPointerMove={e => onBlockPointerMove(e, block.id)}
                    onPointerUp={e   => onBlockPointerUp(e, block.id)}
                    onPointerCancel={e => onBlockPointerCancel(e, block.id)}
                    onClick={e => e.stopPropagation()}
                    title="Drag to resize"
                    style={{
                      position:       'absolute',
                      bottom:         0,
                      left:           0,
                      right:          0,
                      height:         14,
                      display:        'flex',
                      alignItems:     'flex-end',
                      justifyContent: 'center',
                      paddingBottom:  3,
                      opacity:        isHovered ? 1 : 0,
                      transition:     'opacity 0.12s',
                      cursor:         'ns-resize',
                      touchAction:    'none',
                      zIndex:         25,
                    }}
                  >
                    <div style={{
                      width:           36,
                      height:          4,
                      borderRadius:    2,
                      backgroundColor: linked ? 'rgba(255,255,255,0.6)' : '#6366f177',
                    }} />
                  </div>
                </div>
              )
            })}

            {/* Empty grid hint — shown when no sessions and no blocks and no scheduled tasks */}
            {schedule.length === 0 && timeBlocks.length === 0 && scheduledTasks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none"
                style={{ top: (Math.max(9, GRID_START) - GRID_START) * HOUR_H }}>
                <Clock size={22} className="text-th-text5/40 mb-2" />
                <p className="text-xs text-th-text5/60 text-center px-4">No sessions tracked yet</p>
                <p className="text-xs text-th-text5/40 text-center px-4 mt-0.5">Start a timer on any task, or click the grid to plan a focus block</p>
              </div>
            )}

            {/* Scheduled task blocks — tasks with due_time, right lane (54–100%), dashed border.
                Overlapping tasks are split into sub-columns within the right lane. */}
            {(() => {
              // Build layout: detect overlaps, assign columns within right lane
              const items = scheduledTasks
                .map(task => {
                  // Determine start: use start_time if set, else fall back to due_time - duration
                  const hasStart = task.start_time && /^\d{2}:\d{2}/.test(task.start_time)
                  const hasEnd   = task.due_time   && /^\d{2}:\d{2}/.test(task.due_time)

                  let startH, endH
                  if (hasStart && hasEnd) {
                    const [sh, sm] = task.start_time.split(':').map(Number)
                    const [dh, dm] = task.due_time.split(':').map(Number)
                    startH = sh + sm / 60
                    endH   = dh + dm / 60
                    // If end <= start (e.g. midnight wrap), default to 1h block
                    if (endH <= startH) endH = startH + 1
                  } else if (hasStart) {
                    const [sh, sm] = task.start_time.split(':').map(Number)
                    startH = sh + sm / 60
                    const durationH = task.estimate ? Math.min(task.estimate / 3600, 3) : 1
                    endH   = startH + durationH
                  } else {
                    // Only due_time — anchor block end at due_time
                    const [dh, dm] = task.due_time.split(':').map(Number)
                    endH   = dh + dm / 60
                    const durationH = task.estimate ? Math.min(task.estimate / 3600, 3) : 1
                    startH = endH - durationH
                  }

                  startH = Math.max(startH, GRID_START)
                  endH   = Math.min(endH, GRID_END)
                  if (startH >= GRID_END || endH <= GRID_START) return null
                  return { task, startH, endH }
                })
                .filter(Boolean)
                .sort((a, b) => a.startH - b.startH)

              // Assign a column index to each item
              const colEnds = []
              items.forEach(item => {
                let col = 0
                while (colEnds[col] !== undefined && colEnds[col] > item.startH) col++
                colEnds[col] = item.endH
                item.col = col
              })
              // How many columns does each item's overlapping group need?
              items.forEach(item => {
                let maxCol = item.col
                items.forEach(other => {
                  if (other.startH < item.endH && other.endH > item.startH)
                    maxCol = Math.max(maxCol, other.col)
                })
                item.totalCols = maxCol + 1
              })

              const LANE_START = 54  // right lane starts at 54% of grid
              const LANE_WIDTH = 45  // right lane is 45% wide (leaving 1% gap at right)

              return items.map(({ task, startH, endH, col, totalCols }) => {
                const top    = (startH - GRID_START) * HOUR_H
                const height = Math.max((endH - startH) * HOUR_H, 28)
                const color  = task.project_color
                const colW   = LANE_WIDTH / totalCols
                const left   = `${LANE_START + col * colW}%`
                const width  = `${colW - 0.5}%`

                return (
                  <button
                    key={`sched-${task.id}`}
                    onClick={e => { e.stopPropagation(); onSelectTask(task) }}
                    title={`${task.title} — due ${fmtTime(startH)}`}
                    style={{
                      position:        'absolute',
                      left,
                      width,
                      top,
                      height,
                      backgroundColor: color + '33',
                      border:          `1.5px dashed ${color}bb`,
                      borderRadius:    6,
                      zIndex:          18,
                    }}
                    className="flex flex-col justify-center px-2 overflow-hidden text-left hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      {task.icon && <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{task.icon}</span>}
                      <span style={{ fontSize: 11, fontWeight: 500, color, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                        {task.title}
                      </span>
                    </div>
                    {height > 34 && (
                      <span style={{ fontSize: 10, marginTop: 2, color: color + 'aa',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fmtTime(startH)} – {fmtTime(endH)}
                      </span>
                    )}
                  </button>
                )
              })
            })()}

            {/* Time entry blocks (actual) — left lane (0–52%), planned blocks use right lane (54–100%) */}
            {layoutEntries(mergeEntries(schedule.filter(e => e.duration == null || e.duration >= 300))).map(({ entry, col, totalCols }) => {
              const { top, height } = entryToBlock(entry)
              const color    = entry.project_color
              const laneW    = 52   // left lane is 52% of the grid
              const colW     = laneW / totalCols
              const leftPct  = `${2 + col * colW}%`
              const widthPct = `${colW - 0.5}%`
              return (
                <button
                  key={entry.id}
                  onClick={e => { e.stopPropagation(); onSelectTask({ id: entry.task_id, project_id: entry.project_id, project_color: color }) }}
                  style={{
                    position:        'absolute',
                    left:            leftPct,
                    width:           widthPct,
                    top,
                    height,
                    backgroundColor: color + 'cc',
                    borderRadius:    4,
                    zIndex:          10,
                  }}
                  className="flex flex-col justify-center px-2 overflow-hidden hover:opacity-90 transition-all text-left"
                >
                  <div className="flex items-center gap-1.5">
                    {entry.task_icon && <span className="text-xs leading-none">{entry.task_icon}</span>}
                    <span className="text-xs font-medium truncate" style={{ color: '#fff' }}>
                      {entry.task_title}
                    </span>
                  </div>
                  {height > 30 && (
                    <span className="text-xs ml-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {fmtTime(new Date(entry.start_time).getHours() + new Date(entry.start_time).getMinutes() / 60)}
                      {' – '}
                      {fmtTime(new Date(entry.end_time).getHours() + new Date(entry.end_time).getMinutes() / 60)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right panel: active tasks with expandable subtasks — hidden on mobile */}
      <div className="hidden md:flex w-64 shrink-0 border-l border-th-border flex-col overflow-hidden">
        {activeTasks.length > 0 && (
          <>
            <div className="px-3 py-3 border-b border-th-border">
              <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Active Tasks</p>
              <p className="text-xs text-th-text5 mt-0.5">{activeTasks.length} task{activeTasks.length > 1 ? 's' : ''} today</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {activeTasks.map(task => {
                const subs    = subtaskMap[task.id] || []
                const pending = subs.filter(s => !s.done)
                const done    = subs.filter(s => s.done)
                const isOpen  = expanded[task.id]

                return (
                  <div key={task.id} className="rounded-lg border border-th-border/50 overflow-hidden">
                    {/* Task header row */}
                    <div
                      className="flex items-start gap-2 p-2 hover:bg-th-raised/40 transition-colors cursor-pointer"
                      onClick={() => onSelectTask(task)}
                    >
                      {task.icon
                        ? <span className="text-sm leading-tight shrink-0 mt-0.5">{task.icon}</span>
                        : <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: task.project_color }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-th-text1 leading-snug truncate">{task.title}</p>
                        <p className="text-xs text-th-text5 mt-0.5 truncate">{task.project_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {subs.length > 0 && (
                            <p className="text-xs text-th-text5">
                              <ListChecks size={9} className="inline mr-0.5" />
                              {done.length}/{subs.length} subtasks
                            </p>
                          )}
                          {plannedByTask[task.id] > 0 && (
                            <p className="text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: task.project_color + '25', color: task.project_color }}>
                              {plannedByTask[task.id] % 1 === 0
                                ? `${plannedByTask[task.id]}h planned`
                                : `${Math.floor(plannedByTask[task.id])}h ${Math.round((plannedByTask[task.id] % 1) * 60)}m planned`}
                            </p>
                          )}
                        </div>
                      </div>
                      {pending.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [task.id]: !prev[task.id] })) }}
                          className="p-0.5 rounded text-th-text4 hover:text-th-text1 transition-colors shrink-0 mt-0.5"
                          title={isOpen ? 'Hide subtasks' : 'Show subtasks'}
                        >
                          <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Subtask list — expanded */}
                    {isOpen && pending.length > 0 && (
                      <div className="border-t border-th-border/40 bg-th-raised/20 px-2 py-1.5 space-y-0.5">
                        {pending.map(sub => (
                          <button
                            key={sub.id}
                            onClick={async () => {
                              await window.api.toggleSubtask(sub.id)
                              const fresh = await window.api.getSubtasks(task.id)
                              setSubtaskMap(prev => ({ ...prev, [task.id]: fresh || [] }))
                            }}
                            className="w-full flex items-center gap-2 px-1.5 py-1 rounded hover:bg-th-raised/60 transition-colors text-left group"
                          >
                            <div className="w-3.5 h-3.5 rounded border-2 border-th-border group-hover:border-brand-400 flex items-center justify-center shrink-0 transition-colors">
                              <Check size={8} className="text-transparent group-hover:text-brand-400 transition-colors" />
                            </div>
                            <span className="text-xs text-th-text3 truncate">{sub.title}</span>
                          </button>
                        ))}
                        {done.length > 0 && (
                          <div className="pt-1 mt-1 border-t border-th-border/30 space-y-0.5">
                            {done.map(sub => (
                              <div key={sub.id} className="flex items-center gap-2 px-1.5 py-1">
                                <div className="w-3.5 h-3.5 rounded border-2 border-brand-400 bg-brand-400 flex items-center justify-center shrink-0">
                                  <Check size={8} className="text-white" />
                                </div>
                                <span className="text-xs text-th-text5 line-through truncate">{sub.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Unscheduled tasks below */}
              {unscheduled.length > 0 && (
                <>
                  <p className="text-xs text-th-text5 uppercase tracking-wider font-semibold px-1 pt-2">Unscheduled</p>
                  {unscheduled.map(task => <MiniTaskCard key={task.id} task={task} onClick={onSelectTask} />)}
                </>
              )}
            </div>
          </>
        )}
        {activeTasks.length === 0 && unscheduled.length > 0 && (
          <>
            <div className="px-3 py-3 border-b border-th-border">
              <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Unscheduled</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
              {unscheduled.map(task => <MiniTaskCard key={task.id} task={task} onClick={onSelectTask} />)}
            </div>
          </>
        )}
        {activeTasks.length === 0 && schedule.length === 0 && unscheduled.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-th-text5 p-4">
            <Calendar size={28} className="mb-3 opacity-30" />
            <p className="text-xs font-medium text-th-text4 text-center">No tasks scheduled</p>
            <p className="text-xs text-center mt-1 opacity-70">Tasks spanning this date will appear here. Assign a start &amp; due date to any task to see it.</p>
          </div>
        )}
      </div>

      {/* New time block popover */}
      {newBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNewBlock(null)}>
          <div
            className="glass card-shadow rounded-xl p-5 w-88 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-th-text1 mb-0.5">Schedule a Work Block</h3>
            <p className="text-xs text-th-text4 mb-4">Plan focused time — link it to a task to track progress</p>

            {/* Time selectors */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-th-text4 block mb-1">From</label>
                <input
                  type="time"
                  value={fmtHHMM(newBlock.startH)}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number)
                    setNewBlock(b => ({ ...b, startH: h + m / 60 }))
                  }}
                  className="w-full bg-th-surface border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text1 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-th-text4 block mb-1">To</label>
                <input
                  type="time"
                  value={fmtHHMM(newBlock.endH)}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number)
                    setNewBlock(b => ({ ...b, endH: h + m / 60 }))
                  }}
                  className="w-full bg-th-surface border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text1 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Duration preview */}
            {newBlock.endH > newBlock.startH && (
              <p className="text-xs text-th-text4 mb-3">
                Duration: <span className="font-medium text-th-text2">
                  {(() => {
                    const mins = Math.round((newBlock.endH - newBlock.startH) * 60)
                    return mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60 ? `${mins%60}m` : ''}`.trim() : `${mins}m`
                  })()}
                </span>
              </p>
            )}

            {/* Task picker — shows active tasks for today */}
            <div className="mb-3">
              <label className="text-xs text-th-text4 block mb-1">Link to task <span className="text-th-text5">(optional)</span></label>
              <select
                value={blockTaskId}
                onChange={e => {
                  setBlockTaskId(e.target.value)
                  if (e.target.value) setBlockLabel('') // clear manual label when task selected
                }}
                className="w-full bg-th-surface border border-th-border rounded-lg px-3 py-2 text-xs text-th-text1 focus:outline-none focus:border-brand-500"
              >
                <option value="">— Generic focus block —</option>
                {activeTasks.map(t => (
                  <option key={t.id} value={String(t.id)}>
                    {t.icon ? `${t.icon} ` : ''}{t.title} ({t.project_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Label — shown when no task selected, or as override */}
            {!blockTaskId && (
              <input
                autoFocus
                type="text"
                placeholder="Label (e.g. Deep Work, Review…)"
                value={blockLabel}
                onChange={e => setBlockLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveBlock(); if (e.key === 'Escape') setNewBlock(null) }}
                className="w-full bg-th-surface border border-th-border rounded-lg px-3 py-2 text-sm text-th-text1 placeholder:text-th-text5 focus:outline-none focus:border-brand-500 mb-3"
              />
            )}
            {blockTaskId && (
              <p className="text-xs text-th-text5 mb-3">
                Block will show in the task's project colour on the calendar.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setNewBlock(null)} className="px-3 py-1.5 rounded-lg text-xs text-th-text3 hover:bg-th-raised transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveBlock}
                disabled={!blockTaskId && !blockLabel.trim()}
                className="px-3 py-1.5 rounded-lg text-xs bg-brand-500 text-white font-medium hover:bg-brand-400 transition-colors disabled:opacity-40"
              >
                Add Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DayTaskCard({ task, onClick, showRange = false }) {
  const overdue = isOverdue(task.due_date) && task.status !== 'done'
  const { start, end } = taskRange(task)

  return (
    <button
      onClick={() => onClick(task)}
      className="w-full text-left p-2.5 rounded-lg border transition-all hover:opacity-90"
      style={{ borderColor: task.project_color + '55', backgroundColor: task.project_color + '12' }}
    >
      <div className="flex items-start gap-2 mb-1">
        {task.icon
          ? <span className="text-sm leading-tight shrink-0 mt-0.5">{task.icon}</span>
          : <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: task.project_color }} />
        }
        <p className={`text-xs font-medium leading-snug flex-1 ${overdue ? 'text-red-400' : 'text-th-text1'}`}>{task.title}</p>
      </div>
      <div className="flex items-center justify-between ml-3.5">
        <span className="text-xs text-th-text5 truncate">{task.project_name}</span>
        <div className="flex items-center gap-2 shrink-0">
          {showRange && start && end && start !== end && (
            <span className="text-xs text-th-text5 font-mono">{start} → {end}</span>
          )}
          {task.due_time && <span className="text-xs text-th-text5">{task.due_time}</span>}
          {task.total_time > 0 && (
            <span className="text-xs text-th-text5 flex items-center gap-0.5"><Clock size={9} />{formatDuration(task.total_time)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Timeline view (horizontal Gantt) ──────────────────────────────────────────
const COL_W    = 38
const TL_ROW_H = 30
const TL_BAR_H = 20
const LABEL_W  = 200

function TimelineView({ currentDate, tasks, onSelectTask }) {
  const today   = todayStr()
  const year    = currentDate.getFullYear()
  const month   = currentDate.getMonth()
  const firstDay     = new Date(year, month, 1)
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const rangeStart   = localDateStr(firstDay)
  const rangeEnd     = localDateStr(new Date(year, month + 1, 0))

  const days = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d = addDays(firstDay, i)
      return { date: d, str: localDateStr(d) }
    }),
  [year, month])

  const projects = useMemo(() => {
    const map = {}
    tasks.forEach(t => {
      if (!map[t.project_id]) map[t.project_id] = { id: t.project_id, name: t.project_name, color: t.project_color, tasks: [] }
      map[t.project_id].tasks.push(t)
    })
    return Object.values(map)
  }, [tasks])

  const totalWidth = LABEL_W + days.length * COL_W

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div style={{ minWidth: `${totalWidth}px` }}>
        {/* Sticky date header */}
        <div className="flex sticky top-0 z-20 bg-th-surface/90 backdrop-blur-sm border-b border-th-border" style={{ height: `${TL_ROW_H + 12}px` }}>
          {/* Corner */}
          <div className="sticky left-0 z-30 bg-th-surface/90 backdrop-blur-sm border-r border-th-border shrink-0 flex items-end pb-2 px-4" style={{ width: LABEL_W }}>
            <span className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Task</span>
          </div>
          {/* Day columns */}
          {days.map(({ date, str }) => (
            <div
              key={str}
              className={`shrink-0 flex flex-col items-center justify-end pb-1 border-r border-th-border/20 ${str === today ? 'bg-brand-500/15' : ''}`}
              style={{ width: COL_W }}
            >
              <span className={`text-xs font-bold leading-none ${str === today ? 'text-brand-400' : 'text-th-text3'}`}>{date.getDate()}</span>
              {date.getDate() === 1 && <span className="text-xs text-th-text5 leading-none mt-0.5">{MONTH_NAMES[date.getMonth()].slice(0, 3)}</span>}
            </div>
          ))}
        </div>

        {/* Project + task rows */}
        {projects.map(proj => (
          <div key={proj.id}>
            {/* Project header row */}
            <div className="flex sticky top-0 z-10 border-b border-th-border/50 bg-th-surface/90 backdrop-blur-sm" style={{ height: `${TL_ROW_H - 4}px` }}>
              <div className="sticky left-0 z-20 bg-th-surface/90 backdrop-blur-sm flex items-center gap-2 px-4 border-r border-th-border/30 shrink-0" style={{ width: LABEL_W }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                <span className="text-xs font-semibold text-th-text2 truncate">{proj.name}</span>
              </div>
              <div style={{ flex: 1 }} />
            </div>

            {/* Task rows */}
            {proj.tasks.map(task => {
              const { start, end } = taskRange(task)
              const overdue = isOverdue(task.due_date) && task.status !== 'done'
              const color   = overdue ? '#ef4444' : proj.color

              let barLeft = null, barWidth = null, isBarStart = true, isBarEnd = true
              if (start && end) {
                const cs = start < rangeStart ? rangeStart : start
                const ce = end   > rangeEnd   ? rangeEnd   : end
                if (cs <= rangeEnd && ce >= rangeStart) {
                  isBarStart = start >= rangeStart
                  isBarEnd   = end   <= rangeEnd
                  barLeft  = daysBetween(rangeStart, cs) * COL_W + 2
                  barWidth = (daysBetween(cs, ce) + 1) * COL_W - 4
                }
              }

              return (
                <div
                  key={task.id}
                  className="flex relative border-b border-th-border/20 hover:bg-th-raised/15 cursor-pointer group"
                  style={{ height: `${TL_ROW_H}px` }}
                  onClick={() => onSelectTask(task)}
                >
                  {/* Label */}
                  <div
                    className="sticky left-0 z-10 bg-th-surface flex items-center gap-2 px-4 border-r border-th-border/20 shrink-0 group-hover:bg-th-raised/15"
                    style={{ width: LABEL_W }}
                  >
                    {task.icon && <span className="text-sm shrink-0">{task.icon}</span>}
                    <span className="text-xs text-th-text3 truncate">{task.title}</span>
                  </div>

                  {/* Bar area */}
                  <div className="relative" style={{ width: `${days.length * COL_W}px`, height: TL_ROW_H }}>
                    {/* Today highlight */}
                    {days.map(({ str: ds }, di) => ds === today ? (
                      <div key={ds} className="absolute top-0 bottom-0 bg-brand-500/5 pointer-events-none"
                        style={{ left: di * COL_W, width: COL_W }} />
                    ) : null)}

                    {/* Bar */}
                    {barLeft !== null && (
                      <div
                        style={{
                          position:        'absolute',
                          left:            `${barLeft}px`,
                          width:           `${barWidth}px`,
                          top:             `${(TL_ROW_H - TL_BAR_H) / 2}px`,
                          height:          `${TL_BAR_H}px`,
                          backgroundColor: color + 'cc',
                          borderRadius:    `${isBarStart ? 3 : 0}px ${isBarEnd ? 3 : 0}px ${isBarEnd ? 3 : 0}px ${isBarStart ? 3 : 0}px`,
                        }}
                        className="flex items-center px-2 overflow-hidden"
                      >
                        {isBarStart && (
                          <span className="text-xs font-medium truncate" style={{ color: '#fff' }}>
                            {task.title}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {projects.length === 0 && (
          <div className="flex items-center justify-center py-20 text-th-text5 text-sm">
            No tasks to display
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mini task card (unscheduled sidebar) ───────────────────────────────────────
function MiniTaskCard({ task, onClick }) {
  return (
    <button
      onClick={() => onClick(task)}
      className="w-full text-left p-2.5 rounded-lg border transition-all hover:opacity-90"
      style={{ borderColor: task.project_color + '55', backgroundColor: task.project_color + '12' }}
    >
      <div className="flex items-start gap-2">
        {task.icon
          ? <span className="text-sm leading-tight shrink-0">{task.icon}</span>
          : <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: task.project_color }} />
        }
        <p className="text-xs font-medium text-th-text1 leading-snug truncate">{task.title}</p>
      </div>
      <p className="text-xs text-th-text5 mt-1 ml-3.5 truncate">{task.project_name}</p>
    </button>
  )
}

// ── Main CalendarView ──────────────────────────────────────────────────────────
export default function CalendarView({ onOpenFocusPomodoro }) {
  const { state } = useApp()
  const { projects } = state

  const [tasks, setTasks]               = useState([])
  const [view, setView]                 = useState('month')
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [projectFilter, setProjectFilter] = useState('all')
  const [selectedTask, setSelectedTask] = useState(null)
  const [loading, setLoading]           = useState(true)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const data = await window.api.getCalendarTasks()
    setTasks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const filteredTasks = useMemo(() => {
    if (projectFilter === 'all') return tasks
    return tasks.filter(t => String(t.project_id) === projectFilter)
  }, [tasks, projectFilter])

  function navigate(dir) {
    const d = new Date(currentDate)
    if (view === 'week')       d.setDate(d.getDate() + dir * 7)
    else if (view === 'day')   d.setDate(d.getDate() + dir)
    else                       d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  function handleSelectDay(date) {
    setCurrentDate(date)
    setView('day')
  }

  const activeProjects = projects.filter(p => p.status === 'active')

  const VIEWS = [
    { id: 'month',    label: 'Month' },
    { id: 'week',     label: 'Week' },
    { id: 'day',      label: 'Day' },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-th-border bg-th-surface shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors">
                <ChevronLeft size={17} />
              </button>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text1 hover:bg-th-raised transition-colors">
                <ChevronRight size={17} />
              </button>
            </div>
            <h2 className="text-sm md:text-base font-semibold text-th-text1 min-w-0">
              {formatHeader(currentDate, view)}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 rounded-lg text-xs font-medium text-th-text3 bg-th-raised hover:bg-th-card hover:text-th-text1 border border-th-border transition-colors"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="bg-th-card border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500 max-w-[120px] md:max-w-none"
            >
              <option value="all">All Projects</option>
              {activeProjects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>

            <div className="flex items-center gap-0.5 bg-th-raised border border-th-border rounded-lg p-0.5">
              {VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-2 md:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    view === id ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {view === 'month' && (
              <GanttMonthView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
                onSelectDay={handleSelectDay}
              />
            )}
            {view === 'week' && (
              <GanttWeekView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
                onSelectDay={handleSelectDay}
              />
            )}
            {view === 'day' && (
              <DayView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
              />
            )}
            {view === 'timeline' && (
              <TimelineView
                currentDate={currentDate}
                tasks={filteredTasks}
                onSelectTask={setSelectedTask}
              />
            )}
          </div>
        )}
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          taskId={selectedTask.id}
          projectId={selectedTask.project_id}
          projectColor={selectedTask.project_color}
          onClose={() => setSelectedTask(null)}
          onUpdated={loadTasks}
          onOpenFocusPomodoro={onOpenFocusPomodoro}
        />
      )}
    </div>
  )
}
