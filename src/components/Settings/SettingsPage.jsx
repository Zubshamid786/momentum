import React, { useState } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { getStoredCreds, storeCreds, clearCreds, connect, q } from '../../data/queryClient'

// ── Cloud Sync (Turso) ────────────────────────────────────────────────────────
// Connect: verifies creds, saves them, reloads → bootstrap picks turso mode.
// Disconnect: clears creds, reloads → desktop falls back to its local database.
function CloudSyncSection() {
  const creds = getStoredCreds()
  const [url, setUrl]         = useState('')
  const [token, setToken]     = useState('')
  const [status, setStatus]   = useState(null)   // null | 'testing' | error string

  async function handleConnect() {
    setStatus('testing')
    try {
      connect({ url: url.trim(), token: token.trim() })
      await q.get('SELECT 1 AS ok')
      storeCreds(url, token)
      localStorage.removeItem('momentum_turso_schema_r1')  // re-verify schema on next boot
      window.location.reload()
    } catch (err) {
      setStatus(err?.message || 'Connection failed — check URL and token.')
    }
  }

  function handleDisconnect() {
    clearCreds()
    localStorage.removeItem('momentum_turso_schema_r1')
    window.location.reload()
  }

  return (
    <section className="glass-card rounded-xl p-5 mb-6">
      <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Cloud Sync</h2>
      <p className="text-xs text-th-text5 mb-4">
        {creds
          ? 'This device reads and writes the shared Turso cloud database.'
          : 'Connect a Turso database to share one dataset across all your devices.'}
      </p>

      {creds ? (
        <>
          <Row label="Status" hint={creds.url}>
            <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">● Connected</span>
          </Row>
          <Row label="Disconnect" hint="Switch this device back to its local database. Cloud data is untouched.">
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </Row>
        </>
      ) : (
        <div className="space-y-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="libsql://your-db-yourname.turso.io"
            className="w-full bg-th-raised border border-th-border rounded-lg px-3 py-2 text-xs font-mono text-th-text1 placeholder:text-th-text5 focus:outline-none focus:border-brand-500"
          />
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Auth token"
            className="w-full bg-th-raised border border-th-border rounded-lg px-3 py-2 text-xs font-mono text-th-text1 placeholder:text-th-text5 focus:outline-none focus:border-brand-500"
          />
          {status && status !== 'testing' && (
            <p className="text-xs text-red-400 break-words">{status}</p>
          )}
          <button
            onClick={handleConnect}
            disabled={status === 'testing' || !url.trim() || !token.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-40"
          >
            {status === 'testing' ? 'Connecting…' : 'Connect & Reload'}
          </button>
        </div>
      )}
    </section>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-th-border/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-th-text2">{label}</p>
        {hint && <p className="text-xs text-th-text5 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, min = 1, max = 120 }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(parseInt(e.target.value) || min)}
      className="w-20 bg-th-raised border border-th-border rounded-lg px-3 py-1.5 text-sm text-th-text1 text-center focus:outline-none focus:border-brand-500 transition-colors"
    />
  )
}

export default function SettingsPage() {
  const { settings, update } = useSettings()
  const [backupStatus,  setBackupStatus]  = useState(null)
  const [restoreStatus, setRestoreStatus] = useState(null)

  async function handleBackup() {
    setBackupStatus('working')
    const result = await window.api.backupDb()
    setBackupStatus(result.cancelled ? null : 'done')
    setTimeout(() => setBackupStatus(null), 3000)
  }

  async function handleRestore() {
    setRestoreStatus('working')
    const result = await window.api.restoreDb()
    if (result.success) {
      setRestoreStatus('done')
      setTimeout(() => { setRestoreStatus(null); window.location.reload() }, 1500)
    } else {
      setRestoreStatus(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-th-text1 mb-6">Settings</h1>

      {/* Pomodoro */}
      <section className="glass-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Pomodoro Timer</h2>
        <p className="text-xs text-th-text5 mb-4">Configure work and break durations for Focus Mode</p>

        <Row label="Work duration" hint="Minutes of focused work per session">
          <div className="flex items-center gap-2">
            <NumInput value={settings.pomodoro_work_min} min={1} max={120}
              onChange={v => update('pomodoro_work_min', v)} />
            <span className="text-xs text-th-text5">min</span>
          </div>
        </Row>

        <Row label="Short break" hint="Break after each work session">
          <div className="flex items-center gap-2">
            <NumInput value={settings.pomodoro_break_min} min={1} max={60}
              onChange={v => update('pomodoro_break_min', v)} />
            <span className="text-xs text-th-text5">min</span>
          </div>
        </Row>

        <Row label="Long break" hint="Longer break after several sessions">
          <div className="flex items-center gap-2">
            <NumInput value={settings.pomodoro_long_break_min} min={1} max={60}
              onChange={v => update('pomodoro_long_break_min', v)} />
            <span className="text-xs text-th-text5">min</span>
          </div>
        </Row>

        <Row label="Long break after" hint="Number of work sessions before a long break">
          <div className="flex items-center gap-2">
            <NumInput value={settings.pomodoro_long_after} min={1} max={10}
              onChange={v => update('pomodoro_long_after', v)} />
            <span className="text-xs text-th-text5">sessions</span>
          </div>
        </Row>

        <Row label="Sound & notifications" hint="Play a chime and send a system notification when each phase ends">
          <button
            onClick={() => update('pomodoro_sound', settings.pomodoro_sound ? 0 : 1)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.pomodoro_sound ? 'bg-brand-500' : 'bg-th-raised border border-th-border'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${settings.pomodoro_sound ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </Row>
      </section>

      {/* Calendar */}
      <section className="glass-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Calendar</h2>
        <p className="text-xs text-th-text5 mb-4">Adjust how the calendar displays</p>

        <Row label="Day view start hour" hint="First hour shown in the day timeline">
          <div className="flex items-center gap-2">
            <select
              value={settings.work_start_hour}
              onChange={e => update('work_start_hour', parseInt(e.target.value))}
              className="bg-th-raised border border-th-border rounded-lg px-3 py-1.5 text-sm text-th-text1 focus:outline-none focus:border-brand-500 transition-colors"
            >
              {Array.from({ length: 13 }, (_, i) => i + 5).map(h => (
                <option key={h} value={h}>
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </option>
              ))}
            </select>
          </div>
        </Row>
      </section>

      {/* Time Goals */}
      <section className="glass-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Time Goals</h2>
        <p className="text-xs text-th-text5 mb-4">Set daily and weekly hour targets — progress bars appear on the Dashboard. Set to 0 to disable.</p>

        <Row label="Daily goal" hint="Target hours of tracked work per day">
          <div className="flex items-center gap-2">
            <NumInput value={settings.daily_hour_goal} min={0} max={24}
              onChange={v => update('daily_hour_goal', v)} />
            <span className="text-xs text-th-text5">hrs</span>
          </div>
        </Row>

        <Row label="Weekly goal" hint="Target hours of tracked work per week">
          <div className="flex items-center gap-2">
            <NumInput value={settings.weekly_hour_goal} min={0} max={168}
              onChange={v => update('weekly_hour_goal', v)} />
            <span className="text-xs text-th-text5">hrs</span>
          </div>
        </Row>
      </section>

      {/* Tasks */}
      <section className="glass-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Tasks</h2>
        <p className="text-xs text-th-text5 mb-4">Default values for new tasks</p>

        <Row label="Default notify before" hint="Minutes before deadline to send a notification">
          <div className="flex items-center gap-2">
            <NumInput value={settings.default_notify_before} min={1} max={120}
              onChange={v => update('default_notify_before', v)} />
            <span className="text-xs text-th-text5">min</span>
          </div>
        </Row>
      </section>

      {/* Cloud Sync */}
      <CloudSyncSection />

      {/* Data */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-semibold text-th-text1 tracking-tight mb-1">Data</h2>
        <p className="text-xs text-th-text5 mb-4">Export or restore your Momentum database</p>

        <Row label="Backup database" hint="Save a copy of your database to a chosen location">
          <button
            onClick={handleBackup}
            disabled={backupStatus === 'working'}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-th-raised border border-th-border hover:bg-th-card hover:text-th-text1 text-th-text2 transition-colors disabled:opacity-50"
          >
            {backupStatus === 'working' ? 'Saving…' : backupStatus === 'done' ? '✓ Saved' : 'Export Database'}
          </button>
        </Row>

        <Row label="Restore from backup" hint="Replace current data with a backup file. Restarts the app.">
          <button
            onClick={handleRestore}
            disabled={restoreStatus === 'working'}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 transition-colors disabled:opacity-50"
          >
            {restoreStatus === 'working' ? 'Restoring…' : restoreStatus === 'done' ? '✓ Restored' : 'Import Backup'}
          </button>
        </Row>
      </section>
    </div>
  )
}
