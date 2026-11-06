// Piese de interfață folosite peste tot: mesaje scurte (toast), ferestre de jos (sheet), utilitare.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { IconX } from './icons.jsx'

export const store = {
  get(k, fallback = null) {
    try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v) } catch { return fallback }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignorăm */ } },
}

export const firstName = (name) => String(name || '').split(' ')[0]

export function errText(e) {
  const code = e?.code || ''
  if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code)) return null
  if (code === 'auth/unauthorized-domain') return 'Domeniul nu e autorizat în Firebase (vezi SETUP.md).'
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'Nu ai voie să faci asta.'
  if (code === 'auth/network-request-failed') return 'Nu e conexiune la internet.'
  if (code.startsWith('functions/') && e?.message && code !== 'functions/internal') return e.message
  if (e?.name === 'QuotaExceededError') return 'Nu mai e loc în browser (mod demo). Șterge câteva poze.'
  return 'Ceva n-a mers: ' + (e?.message || e)
}

// Re-randează periodic, ca „azi la…” să devină „ieri la…” fără reîncărcare.
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

// ---------- Toast cu „Anulează” ----------

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((text, undo) => {
    if (!text) return
    clearTimeout(timer.current)
    setToast({ text, undo, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), undo ? 5000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null) }}>Anulează</button>}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

// ---------- Fereastră de jos ----------

export function Sheet({ title, onClose, children, className = '' }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Închide"><IconX /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, children }) {
  return (
    <label className="switch">
      <span className="grow">{children}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
    </label>
  )
}
