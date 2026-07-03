import { useState, useEffect } from 'react'
import { Flame } from 'lucide-react'

const HOURS  = Array.from({ length: 24 }, (_, i) => i)
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtHour(h) {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function cellColor(val, max) {
  if (!val || val === 0) return 'bg-white/3 text-transparent'
  const ratio = Math.min(val / max, 1)
  if (ratio < 0.2)  return 'bg-indigo-900/60'
  if (ratio < 0.4)  return 'bg-indigo-700/70'
  if (ratio < 0.6)  return 'bg-indigo-600/80'
  if (ratio < 0.8)  return 'bg-indigo-500'
  return 'bg-indigo-400'
}

export default function ProductivityHeatmap() {
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tz = -new Date().getTimezoneOffset()
    window.api.getProductivityHeatmap(tz).then(d => {
      setData(d || [])
      setLoading(false)
    })
  }, [])

  // Build a map: dow -> hour -> seconds
  const map = {}
  for (const row of data) {
    if (!map[row.dow]) map[row.dow] = {}
    map[row.dow][row.hour] = row.total
  }
  const maxVal = Math.max(1, ...data.map(d => d.total))

  // Find peak hour and day
  let peakDow = 0, peakHour = 9
  let peakVal = 0
  for (const row of data) {
    if (row.total > peakVal) { peakVal = row.total; peakDow = row.dow; peakHour = row.hour }
  }

  // Totals per day and per hour for axis labels
  const dayTotals  = DAYS.map((_, i) => Object.values(map[i] || {}).reduce((s, v) => s + v, 0))
  const peakDayIdx = dayTotals.indexOf(Math.max(...dayTotals))

  return (
    <div className="glass-card card-shadow rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Flame size={15} className="text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Productivity Heatmap</h3>
          <p className="text-xs text-slate-500">When are you most focused? (all-time, hours × days)</p>
        </div>
        {peakVal > 0 && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Peak: <span className="text-orange-300 font-medium">{DAYS[peakDow]} {fmtHour(peakHour)}</span></p>
            <p className="text-xs text-slate-500">Best day: <span className="text-slate-300">{DAYS[peakDayIdx]}</span></p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Loading heatmap…</div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No time data yet — start tracking!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 min-w-max">
            <thead>
              <tr>
                <th className="w-8" />
                {HOURS.map(h => (
                  <th key={h} className="text-[9px] text-slate-600 font-normal px-0 py-0 w-7 text-center">
                    {h % 3 === 0 ? fmtHour(h) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dow) => (
                <tr key={dow}>
                  <td className="text-[10px] text-slate-500 pr-1 whitespace-nowrap text-right">{day}</td>
                  {HOURS.map(h => {
                    const val = map[dow]?.[h] || 0
                    const mins = Math.round(val / 60)
                    return (
                      <td key={h} title={val ? `${day} ${fmtHour(h)}: ${mins}m` : undefined}>
                        <div className={`w-6 h-5 rounded-sm transition-all ${cellColor(val, maxVal)}`} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-slate-600">Less</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(r => (
              <div key={r} className={`w-4 h-3 rounded-sm ${cellColor(r * maxVal, maxVal)}`} />
            ))}
            <span className="text-[10px] text-slate-600">More</span>
          </div>
        </div>
      )}
    </div>
  )
}
