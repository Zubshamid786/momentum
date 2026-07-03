import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_ABBR = ['M','T','W','T','F','S','S']

export default function HabitTracker() {
  const [habits, setHabits]           = useState([])
  const [completions, setCompletions] = useState({}) // "taskId:date" -> true

  const load = useCallback(async () => {
    const data = await window.api.getHabitData()
    setHabits(data?.habits || [])
    const map = {}
    ;(data?.completions || []).forEach(c => { map[`${c.task_id}:${c.date}`] = true })
    setCompletions(map)
  }, [])

  useEffect(() => { load() }, [load])

  // Last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    return { date: d, str: localDateStr(d) }
  })

  const today = localDateStr(new Date())

  async function toggle(habitId, dateStr) {
    await window.api.toggleHabit(habitId, dateStr)
    load()
  }

  if (habits.length === 0) return null

  return (
    <div className="glass-card card-shadow rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-th-text1">Habits</h3>
        <span className="text-xs text-th-text5">Last 14 days</span>
      </div>

      {/* Date header */}
      <div className="flex mb-3">
        <div className="w-36 shrink-0" />
        <div className="flex flex-1 justify-between">
          {days.map(({ date, str }, i) => (
            <div key={str} className="flex flex-col items-center gap-0.5" style={{ width: 24 }}>
              {i === 0 || date.getDate() === 1 ? (
                <span className="text-xs text-th-text5 leading-none">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}
                </span>
              ) : <span className="text-xs leading-none"> </span>}
              <span className={`text-xs font-medium leading-none ${str === today ? 'text-brand-400' : 'text-th-text5'}`}>
                {DAY_ABBR[(date.getDay() + 6) % 7]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Habit rows */}
      <div className="space-y-2">
        {habits.map(habit => {
          const streak = (() => {
            let s = 0
            for (let i = days.length - 1; i >= 0; i--) {
              if (completions[`${habit.id}:${days[i].str}`]) s++
              else break
            }
            return s
          })()

          return (
            <div key={habit.id} className="flex items-center">
              {/* Label */}
              <div className="w-36 shrink-0 flex items-center gap-2 pr-3">
                {habit.icon && <span className="text-sm leading-none">{habit.icon}</span>}
                <span className="text-xs text-th-text2 truncate">{habit.title}</span>
                {streak > 1 && (
                  <span className="text-xs text-orange-400 shrink-0">🔥{streak}</span>
                )}
              </div>
              {/* Day cells */}
              <div className="flex flex-1 justify-between">
                {days.map(({ str, date }) => {
                  const done    = completions[`${habit.id}:${str}`]
                  const isFuture = str > today
                  return (
                    <button
                      key={str}
                      disabled={isFuture}
                      onClick={() => toggle(habit.id, str)}
                      title={str}
                      style={{ width: 24, height: 24 }}
                      className={`flex items-center justify-center rounded-md transition-all ${
                        isFuture ? 'opacity-20 cursor-not-allowed'
                        : done    ? 'hover:opacity-80'
                        : 'hover:opacity-70'
                      }`}
                    >
                      {done ? (
                        <div className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: habit.project_color + '40', border: `1.5px solid ${habit.project_color}` }}>
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: habit.project_color }} />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-md border ${str === today ? 'border-brand-500/50' : 'border-th-border'}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-th-text5 mt-3">
        Habits are daily recurring tasks. Set a task's recurrence to "Daily" to track it here.
      </p>
    </div>
  )
}
