import React, { useState } from 'react'
import { connect, storeCreds, q } from '../../data/queryClient'

// First-run screen for cloud mode (GitHub Pages): collects the Turso database
// URL + auth token, verifies the connection, then persists creds locally.
// Credentials live only in this browser's localStorage — never in the repo.
export default function CloudSetup() {
  const [url, setUrl]         = useState('')
  const [token, setToken]     = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError]     = useState(null)

  async function handleConnect(e) {
    e.preventDefault()
    if (!url.trim() || !token.trim()) return
    setTesting(true)
    setError(null)
    try {
      connect({ url: url.trim(), token: token.trim() })
      await q.get('SELECT 1 AS ok')          // verify reachability + auth
      storeCreds(url, token)
      window.location.reload()               // boot into the app with creds
    } catch (err) {
      setError(err?.message || 'Could not connect — check the URL and token.')
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-th-bg p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold">⚡</div>
          <div>
            <h1 className="text-lg font-bold text-th-text1">Momentum</h1>
            <p className="text-xs text-th-text4">Connect your cloud database</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="bg-th-surface border border-th-border rounded-2xl p-5 space-y-4 shadow-2xl">
          <div>
            <label className="block text-xs font-semibold text-th-text3 mb-1.5">Turso Database URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="libsql://your-db-yourname.turso.io"
              autoComplete="off"
              className="w-full bg-th-raised border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder:text-th-text5 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-th-text3 mb-1.5">Auth Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="eyJhbGciOi…"
              autoComplete="off"
              className="w-full bg-th-raised border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder:text-th-text5 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-400 break-words">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={testing || !url.trim() || !token.trim()}
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {testing ? 'Connecting…' : 'Connect'}
          </button>

          <div className="pt-1 border-t border-th-border/50 space-y-1.5">
            <p className="text-2xs text-th-text5 leading-relaxed">
              Get these from <span className="font-mono text-th-text4">turso.tech</span> — create a free database, then copy its
              URL and generate a token. Credentials are stored only in this browser.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
