import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, Eye, Pencil, Bold, Italic, List, Heading1, Heading2, Minus, X } from 'lucide-react'

function toLocalISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = toLocalISO(new Date())
  const yesterday = toLocalISO(new Date(Date.now() - 86400000))
  if (isoDate === today) return 'Today'
  if (isoDate === yesterday) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function inlineMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  let html = '', inUL = false, inOL = false, paraLines = []

  function flushPara() {
    if (paraLines.length) { html += `<p>${paraLines.map(inlineMarkdown).join('<br/>')}</p>`; paraLines = [] }
  }
  function closeUL() { if (inUL) { html += '</ul>'; inUL = false } }
  function closeOL() { if (inOL) { html += '</ol>'; inOL = false } }

  for (const line of lines) {
    if (/^# /.test(line))        { flushPara(); closeUL(); closeOL(); html += `<h1>${inlineMarkdown(line.slice(2))}</h1>` }
    else if (/^## /.test(line))  { flushPara(); closeUL(); closeOL(); html += `<h2>${inlineMarkdown(line.slice(3))}</h2>` }
    else if (/^### /.test(line)) { flushPara(); closeUL(); closeOL(); html += `<h3>${inlineMarkdown(line.slice(4))}</h3>` }
    else if (/^---+$/.test(line.trim())) { flushPara(); closeUL(); closeOL(); html += '<hr/>' }
    else if (/^[-*] /.test(line)) { flushPara(); closeOL(); if (!inUL) { html += '<ul>'; inUL = true }; html += `<li>${inlineMarkdown(line.slice(2))}</li>` }
    else if (/^\d+\. /.test(line)) { flushPara(); closeUL(); if (!inOL) { html += '<ol>'; inOL = true }; html += `<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>` }
    else if (line.trim() === '') { flushPara(); closeUL(); closeOL() }
    else { closeUL(); closeOL(); paraLines.push(line) }
  }
  flushPara(); closeUL(); closeOL()
  return html
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolbarBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={label}
      className="p-1.5 rounded-md transition-colors text-th-text4 hover:text-th-text2 hover:bg-th-raised"
    >
      <Icon size={14} />
    </button>
  )
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']

function MiniCalendar({ selectedDate, onSelectDate, entryDates }) {
  const today = toLocalISO(new Date())
  const [viewYear,  setViewYear]  = useState(() => parseInt(selectedDate.split('-')[0]))
  const [viewMonth, setViewMonth] = useState(() => parseInt(selectedDate.split('-')[1]))

  // Sync view when selected date changes externally
  useEffect(() => {
    const y = parseInt(selectedDate.split('-')[0])
    const m = parseInt(selectedDate.split('-')[1])
    setViewYear(y); setViewMonth(m)
  }, [selectedDate])

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const now = new Date()
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth() + 1)) return
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const entrySet = new Set(entryDates)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isCurrentMonth = viewYear === new Date().getFullYear() && viewMonth === new Date().getMonth() + 1

  return (
    <div className="px-3 py-3 border-b border-th-border">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-th-text2">{MONTHS[viewMonth - 1]} {viewYear}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth}
          className="p-1 rounded text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors disabled:opacity-30 disabled:pointer-events-none">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-2xs text-th-text5 font-medium py-0.5">{w}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const iso     = `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday = iso === today
          const isSel   = iso === selectedDate
          const hasEntry = entrySet.has(iso)
          const isFuture = iso > today

          return (
            <button
              key={iso}
              onClick={() => !isFuture && onSelectDate(iso)}
              disabled={isFuture}
              className={`relative flex flex-col items-center justify-center h-7 w-full rounded-md text-xs transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                isSel    ? 'bg-brand-500 text-white font-semibold' :
                isToday  ? 'bg-brand-500/20 text-brand-400 font-semibold' :
                'text-th-text3 hover:bg-th-raised hover:text-th-text1'
              }`}
            >
              {day}
              {hasEntry && !isSel && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-brand-400' : 'bg-brand-500/60'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function JournalPage() {
  const today = toLocalISO(new Date())
  const [date, setDate]             = useState(today)
  const [content, setContent]       = useState('')
  const [saved, setSaved]           = useState(true)
  const [preview, setPreview]       = useState(false)
  const [entryDates, setEntryDates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const saveTimer                   = useRef(null)
  const textareaRef                 = useRef(null)

  // Load calendar dots for the current viewed month
  const loadMonthDates = useCallback(async (isoDate) => {
    const y = parseInt(isoDate.split('-')[0])
    const m = parseInt(isoDate.split('-')[1])
    const dates = await window.api.getNoteMonthDates(y, m)
    setEntryDates(dates || [])
  }, [])

  const loadNote = useCallback(async (d) => {
    setLoading(true)
    const note = await window.api.getNote(d)
    setContent(note?.content || '')
    setSaved(true)
    setLoading(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  useEffect(() => { loadNote(date) }, [date, loadNote])
  useEffect(() => { loadMonthDates(date) }, [date, loadMonthDates])

  const triggerSave = useCallback((val) => {
    setSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.api.saveNote(date, val)
      setSaved(true)
      loadMonthDates(date)
    }, 800)
  }, [date, loadMonthDates])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)
    triggerSave(val)
  }

  function applyFormat(format) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const sel   = content.substring(start, end)
    let next = content, ns = start, ne = end

    if (format === 'h1' || format === 'h2' || format === 'bullet' || format === 'hr') {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const prefix    = format === 'h1' ? '# ' : format === 'h2' ? '## ' : format === 'bullet' ? '- ' : '---\n'
      next = content.slice(0, lineStart) + prefix + content.slice(lineStart)
      ns = start + prefix.length; ne = end + prefix.length
    } else if (format === 'bold') {
      next = content.slice(0, start) + `**${sel}**` + content.slice(end)
      ns = sel ? start : start + 2; ne = sel ? end + 4 : start + 2
    } else if (format === 'italic') {
      next = content.slice(0, start) + `_${sel}_` + content.slice(end)
      ns = sel ? start : start + 1; ne = sel ? end + 2 : start + 1
    }
    setContent(next)
    triggerSave(next)
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ns, ne) })
  }

  const goDay = (delta) => {
    const [y, m, d] = date.split('-').map(Number)
    const next = toLocalISO(new Date(y, m - 1, d + delta))
    if (next <= today) setDate(next)
  }

  const isToday = date === today

  function pickDate(d) {
    setDate(d)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[240] bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[250] md:z-auto
        w-72 md:w-60 shrink-0 bg-th-surface border-r border-th-border
        flex flex-col overflow-hidden
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-4 py-3 border-b border-th-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-th-text2">
            <BookOpen size={14} className="text-brand-400" />
            Journal
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mini calendar */}
        <MiniCalendar
          selectedDate={date}
          onSelectDate={pickDate}
          entryDates={entryDates}
        />

        {/* Jump to today */}
        {!isToday && (
          <div className="px-3 py-2 border-b border-th-border/50">
            <button
              onClick={() => setDate(today)}
              className="w-full text-xs text-brand-400 hover:text-brand-300 py-1 text-center transition-colors"
            >
              Jump to today
            </button>
          </div>
        )}

        {/* Custom date input */}
        <div className="px-3 py-2 border-b border-th-border/50">
          <input
            type="date"
            max={today}
            value={date}
            onChange={e => e.target.value && e.target.value <= today && pickDate(e.target.value)}
            className="w-full bg-th-raised border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Recent entries list */}
        <div className="flex-1 overflow-y-auto py-1">
          <p className="px-4 pt-2 pb-1 text-2xs font-semibold text-th-text5 uppercase tracking-wider">Recent</p>
          {entryDates.length === 0 ? (
            <p className="px-4 py-2 text-xs text-th-text5 italic">No entries this month</p>
          ) : (
            [...entryDates].sort((a,b) => b.localeCompare(a)).map(d => (
              <button
                key={d}
                onClick={() => pickDate(d)}
                className={`w-full text-left px-4 py-2 transition-colors hover:bg-th-raised ${
                  d === date ? 'bg-brand-500/10 border-r-2 border-brand-400' : ''
                }`}
              >
                <p className={`text-xs font-medium ${d === date ? 'text-brand-400' : 'text-th-text3'}`}>
                  {new Date(...d.split('-').map((v,i) => i===1 ? Number(v)-1 : Number(v))).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 md:px-8 py-3 border-b border-th-border flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-1 md:gap-3 min-w-0">
            {/* Calendar toggle — mobile only */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors shrink-0">
              <Calendar size={16} />
            </button>
            <button onClick={() => goDay(-1)} className="p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors shrink-0">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm md:text-base font-semibold text-th-text1 truncate text-center">{formatDisplayDate(date)}</h2>
            <button onClick={() => goDay(1)} disabled={isToday}
              className="p-1.5 rounded-lg text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-th-text4 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5"><Clock size={12} />{wordCount(content)}w</span>
            <span className={saved ? 'text-green-400' : 'text-yellow-400'}>{saved ? '✓' : '…'}</span>
            <button
              onClick={() => setPreview(v => !v)}
              className={`flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-lg border transition-colors ${
                preview ? 'bg-brand-500/20 border-brand-500/40 text-brand-400' : 'bg-th-raised border-th-border text-th-text3 hover:text-th-text2'
              }`}
            >
              {preview ? <Pencil size={12} /> : <Eye size={12} />}
              <span className="hidden sm:inline">{preview ? 'Edit' : 'Preview'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {!preview && (
          <div className="px-3 md:px-8 py-1.5 border-b border-th-border/50 flex items-center gap-0.5 shrink-0 bg-th-surface/50">
            <ToolbarBtn icon={Heading1} label="Heading 1 (# )"   onClick={() => applyFormat('h1')} />
            <ToolbarBtn icon={Heading2} label="Heading 2 (## )"  onClick={() => applyFormat('h2')} />
            <div className="w-px h-4 bg-th-border mx-1" />
            <ToolbarBtn icon={Bold}     label="Bold (**text**)"  onClick={() => applyFormat('bold')} />
            <ToolbarBtn icon={Italic}   label="Italic (_text_)"  onClick={() => applyFormat('italic')} />
            <div className="w-px h-4 bg-th-border mx-1" />
            <ToolbarBtn icon={List}     label="Bullet list"      onClick={() => applyFormat('bullet')} />
            <ToolbarBtn icon={Minus}    label="Divider (---)"    onClick={() => applyFormat('hr')} />
          </div>
        )}

        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
          {loading ? (
            <div className="text-th-text4 text-sm">Loading…</div>
          ) : preview ? (
            <div
              className="prose-journal max-w-[680px]"
              dangerouslySetInnerHTML={{ __html: content ? renderMarkdown(content) : '<p class="empty-hint">Nothing written yet — switch to Edit to start.</p>' }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              placeholder={`What's on your mind for ${formatDisplayDate(date)}?\n\nTip: use # for headings, **bold**, _italic_, - for bullets`}
              className="w-full h-full min-h-[calc(100vh-240px)] bg-transparent text-th-text1 text-sm leading-relaxed resize-none outline-none placeholder:text-th-text5"
              style={{ maxWidth: '680px' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
