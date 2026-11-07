// Piese de interfață folosite peste tot: mesaje scurte (toast), ferestre de jos (sheet), utilitare.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { IconX } from './icons.jsx'
import { t, lang } from './i18n.jsx'

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
  if (code === 'auth/unauthorized-domain') return t('errUnauthorizedDomain')
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return t('errDenied')
  if (code === 'auth/network-request-failed') return t('errNetwork')
  // Serverul răspunde în română; în altă limbă traducem după cod.
  if (code.startsWith('functions/') && e?.message && code !== 'functions/internal') {
    return (lang() !== 'ro' && t('errFunction', code)) || e.message
  }
  if (e?.name === 'QuotaExceededError') return t('errQuota')
  return t('errGeneric', e?.message || e)
}

// Eroare la trimiterea unui anunț: spunem limpede că n-a plecat.
export function announceErrText(e) {
  const code = e?.code || ''
  const offline = !navigator.onLine || ['functions/unavailable', 'functions/internal', 'functions/deadline-exceeded'].includes(code)
  if (offline) return t('announceOffline')
  return `${t('announceFailed')} ${errText(e) || ''}`.trim()
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
  // `undo`: acțiunea butonului din toast; `label`: textul lui (implicit „Anulează”).
  const show = useCallback((text, undo, label) => {
    if (!text) return
    clearTimeout(timer.current)
    setToast({ text, undo, label, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), undo ? 5000 : 3500)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => { toast.undo(); setToast(null) }}>{toast.label || t('undo')}</button>}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

// ---------- Butonul Back (Android) închide fereastra de deasupra, nu aplicația ----------
// Cât timp e deschisă cel puțin o fereastră, ținem o singură intrare în plus în istoricul
// browserului („paznicul”). Back o consumă: închidem fereastra de deasupra și, dacă mai rămân
// altele deschise, punem paznicul la loc. Dacă ultima fereastră se închide din buton (X, fundal),
// scoatem noi paznicul. Verificarea se face după un moment, ca la trecerea dintr-o fereastră
// în alta paznicul să rămână pe loc.

const layers = []
let guard = false
let ignorePops = 0
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) { ignorePops--; return }
    guard = false
    layers.pop()?.close()
    if (layers.length) { window.history.pushState({ strat: true }, ''); guard = true }
  })
}

// Există ferestre deschise? (actualizarea automată nu reîncarcă peste ele)
export const hasOpenLayers = () => layers.length > 0

export function useBackClose(onClose) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    const layer = { close: () => ref.current() }
    layers.push(layer)
    if (!guard) { window.history.pushState({ strat: true }, ''); guard = true }
    return () => {
      const i = layers.indexOf(layer)
      if (i !== -1) layers.splice(i, 1)
      setTimeout(() => {
        if (!layers.length && guard) { guard = false; ignorePops++; window.history.back() }
      }, 0)
    }
  }, [])
}

// ---------- Fereastră de jos ----------

export function Sheet({ title, onClose, children, className = '' }) {
  useBackClose(onClose)
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
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}><IconX /></button>

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
