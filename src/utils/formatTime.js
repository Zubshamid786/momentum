export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export function formatDurationLong(seconds) {
  if (!seconds || seconds <= 0) return '0:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDurationHours(seconds) {
  if (!seconds || seconds <= 0) return '0.0h'
  return `${(seconds / 3600).toFixed(1)}h`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatTimeOnly(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

export function isDueToday(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDateRange(period) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'today') {
    const s = localDateStr(today)
    return { from: s, to: s }
  }
  if (period === 'week') {
    const from = new Date(today)
    from.setDate(today.getDate() - 6)
    return { from: localDateStr(from), to: localDateStr(today) }
  }
  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: localDateStr(from), to: localDateStr(today) }
  }
  return { from: localDateStr(today), to: localDateStr(today) }
}

export function fillDateRange(data, from, to) {
  const result = []
  const map = {}
  data.forEach(d => { map[d.day] = d.total })

  const current = new Date(from)
  const end = new Date(to)
  while (current <= end) {
    const day = current.toISOString().split('T')[0]
    result.push({ day, total: map[day] || 0 })
    current.setDate(current.getDate() + 1)
  }
  return result
}
