import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Smartphone, Wifi, Globe, X, Copy, Check, AlertCircle } from 'lucide-react'
import QRCode from 'qrcode'

export default function MobileAccessModal({ onClose }) {
  const [wifiUrl,      setWifiUrl]      = useState(null)
  const [tailscaleUrl, setTailscaleUrl] = useState(null)
  const [mode,         setMode]         = useState('wifi')   // 'tailscale' | 'wifi'
  const [qrDataUrl,    setQrDataUrl]    = useState(null)
  const [copied,       setCopied]       = useState(false)
  const [error,        setError]        = useState(null)

  const isDark = document.documentElement.classList.contains('dark')

  // Fetch both addresses once
  useEffect(() => {
    async function init() {
      try {
        let url = null, ts = null
        if (window.api?.getServerInfo) {
          const info = await window.api.getServerInfo()
          url = info?.url
          ts  = info?.tailscaleUrl
        } else {
          url = window.location.origin
        }
        if ((!url || url === 'null') && !ts) {
          setError('API server is not running. Restart Momentum and try again.')
          return
        }
        setWifiUrl(url && url !== 'null' ? url : null)
        setTailscaleUrl(ts || null)
        setMode(ts ? 'tailscale' : 'wifi')   // prefer Tailscale when available
      } catch (e) {
        setError('Could not read server info: ' + e.message)
      }
    }
    init()
  }, [])

  const activeUrl = mode === 'tailscale' ? tailscaleUrl : wifiUrl

  // Regenerate the QR whenever the active URL changes
  useEffect(() => {
    if (!activeUrl) { setQrDataUrl(null); return }
    QRCode.toDataURL(activeUrl, {
      width: 200, margin: 2,
      color: { dark: isDark ? '#c8d8f0' : '#1e293b', light: isDark ? '#0f172a' : '#ffffff' },
    }).then(setQrDataUrl).catch(e => setError('Could not generate QR code: ' + e.message))
  }, [activeUrl, isDark])

  function copyUrl() {
    if (!activeUrl) return
    navigator.clipboard.writeText(activeUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modal = (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', boxSizing: 'border-box',
      }}
    >
      <div className="bg-th-surface border border-th-border rounded-2xl w-full shadow-2xl overflow-y-auto"
        style={{ maxWidth: 360, maxHeight: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-th-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
              <Smartphone size={17} style={{ color: '#7c3aed' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-th-text1">Mobile Access</p>
              <p className="text-xs text-th-text4">Open Momentum on your Android phone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-th-raised text-th-text4 hover:text-th-text2 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {error ? (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          ) : (
            <>
              {/* Mode toggle — only when Tailscale is available */}
              {tailscaleUrl && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-th-raised border border-th-border">
                  <button onClick={() => setMode('tailscale')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'tailscale' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                    <Globe size={13} /> Tailscale
                  </button>
                  <button onClick={() => setMode('wifi')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'wifi' ? 'bg-th-card text-th-text1 shadow-sm' : 'text-th-text4 hover:text-th-text2'}`}>
                    <Wifi size={13} /> Local WiFi
                  </button>
                </div>
              )}

              {/* Context notice */}
              {mode === 'tailscale' ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Globe size={13} className="shrink-0" style={{ color: '#a78bfa' }} />
                  <p className="text-xs" style={{ color: '#c4b5fd' }}>
                    Works <strong>anywhere</strong> — phone &amp; Mac on your Tailscale network. The Mac must be running.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Wifi size={13} className="text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-300">
                    Phone and Mac must be on the <strong>same WiFi</strong> network
                  </p>
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2.5">
                <div className="rounded-xl overflow-hidden border border-th-border p-2 flex items-center justify-center"
                  style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', minWidth: 196, minHeight: 196 }}>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" width={180} height={180} style={{ display: 'block', imageRendering: 'pixelated' }} />
                  ) : (
                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7c3aed', borderTopColor: 'transparent' }} />
                  )}
                </div>
                <p className="text-xs text-th-text4 text-center">Scan with your phone camera or Chrome</p>
              </div>

              {/* URL row */}
              {activeUrl && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-th-raised border border-th-border text-xs font-mono text-th-text2 truncate">
                    {activeUrl}
                  </div>
                  <button onClick={copyUrl}
                    className="p-2 rounded-xl bg-th-raised border border-th-border text-th-text4 hover:text-th-text1 hover:bg-th-card transition-colors shrink-0" title="Copy URL">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Steps */}
          <div className="space-y-2 pt-1">
            {[
              mode === 'tailscale'
                ? 'Make sure Tailscale is connected on your phone'
                : 'Scan the QR code — or paste the URL into Chrome',
              mode === 'tailscale'
                ? 'Scan the QR code — or paste the URL into Chrome'
                : 'Tap the ⋮ menu → "Add to Home Screen"',
              'Tap ⋮ → "Add to Home Screen", then launch Momentum',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                  {i + 1}
                </span>
                <p className="text-xs text-th-text3 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
