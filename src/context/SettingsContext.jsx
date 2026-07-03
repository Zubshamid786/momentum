import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const SettingsContext = createContext(null)

const DEFAULTS = {
  pomodoro_work_min:       25,
  pomodoro_break_min:      5,
  pomodoro_long_break_min: 15,
  pomodoro_long_after:     4,
  pomodoro_sound:          1,
  work_start_hour:         9,
  default_notify_before:   10,
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)

  const load = useCallback(async () => {
    const s = await window.api.getAllSettings()
    const parsed = {}
    Object.entries(s).forEach(([k, v]) => { parsed[k] = Number(v) })
    setSettings(parsed)
  }, [])

  useEffect(() => { load() }, [load])

  async function update(key, value) {
    await window.api.setSetting(key, value)
    setSettings(prev => ({ ...prev, [key]: Number(value) }))
  }

  return (
    <SettingsContext.Provider value={{ settings, update, reload: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
