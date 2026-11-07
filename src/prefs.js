// Preferințe: salvate pe telefon (localStorage) și copiate în cont (vezi startPrefsSync),
// ca să revină după o reinstalare.
import { useEffect, useState } from 'react'
import { DEFAULT_ICON, iconDataUrl, iconKey } from './appIcons.js'

export const THEMES = [
  { id: 'auto', label: 'Automat' },
  { id: 'light', label: 'Luminos' },
  { id: 'dark', label: 'Întunecat' },
]

// `google` = numele familiei pe Google Fonts; null = fontul telefonului.
export const FONTS = [
  { id: 'system', label: 'Fontul telefonului', css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', google: null },
  { id: 'nunito', label: 'Nunito (rotunjit)', css: '"Nunito", sans-serif', google: 'Nunito:wght@400;600;700' },
  { id: 'lexend', label: 'Lexend (foarte lizibil)', css: '"Lexend", sans-serif', google: 'Lexend:wght@400;500;700' },
  { id: 'hand', label: 'Patrick Hand (scris de mână)', css: '"Patrick Hand", cursive', google: 'Patrick+Hand' },
]

const DEFAULTS = { theme: 'auto', font: 'system', suggestions: true, groupByAisle: true, icon: DEFAULT_ICON.design, iconColor: DEFAULT_ICON.color, listOrder: [], personalLists: [] }
const KEY = 'cumparaturi-prefs'

function load() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(KEY)) || {} } catch { /* ignorăm */ }
  // Ordinea listelor stătea înainte într-o cheie separată.
  if (!saved.listOrder) { try { saved.listOrder = JSON.parse(localStorage.getItem('ordine-liste')) || [] } catch { /* ignorăm */ } }
  return { ...DEFAULTS, ...saved }
}

let current = load()
const subs = new Set()

const changeSubs = new Set()

function commit(next, fromAccount = false) {
  current = next
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* ignorăm */ }
  apply(current)
  subs.forEach((f) => f(current))
  if (!fromAccount) changeSubs.forEach((f) => f(current))
}

export function setPref(key, value) {
  commit({ ...current, [key]: value })
}

// ---------- Sincronizarea cu contul ----------
// La prima intrare pe un telefon (sau după reinstalare) luăm setările din cont, dacă există;
// altfel le trimitem pe cele de pe telefon. După aceea, fiecare schimbare ajunge și în cont.

const KNOWN = Object.keys(DEFAULTS)
const clean = (p) => Object.fromEntries(KNOWN.filter((k) => k in p).map((k) => [k, p[k]]))

export function startPrefsSync(uid, { loadUserPrefs, saveUserPrefs }) {
  const flag = `prefs-sync-${uid}`
  let alive = true
  let timer
  const push = () => { clearTimeout(timer); timer = setTimeout(() => saveUserPrefs(uid, clean(current)), 1500) }

  ;(async () => {
    let remote
    try { remote = await loadUserPrefs(uid) } catch { return } // fără rețea: încercăm la pornirea următoare
    if (!alive) return
    let synced = false
    try { synced = localStorage.getItem(flag) === '1' } catch { /* ignorăm */ }
    if (!synced && remote) commit({ ...DEFAULTS, ...clean(remote) }, true)
    else push()
    try { localStorage.setItem(flag, '1') } catch { /* ignorăm */ }
  })()

  const onChange = () => push()
  changeSubs.add(onChange)
  return () => { alive = false; changeSubs.delete(onChange) }
}

export function usePrefs() {
  const [p, setP] = useState(current)
  useEffect(() => { subs.add(setP); return () => subs.delete(setP) }, [])
  return p
}

function apply(p) {
  const root = document.documentElement
  if (p.theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = p.theme

  const font = FONTS.find((f) => f.id === p.font) || FONTS[0]
  root.style.setProperty('--font', font.css)
  if (font.google && !document.getElementById(`font-${font.id}`)) {
    const link = document.createElement('link')
    link.id = `font-${font.id}`
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
    document.head.appendChild(link)
  }

  applyIcon(p)

  // Culoarea barei de stare de pe telefon urmează tema efectivă.
  const dark = p.theme === 'dark' || (p.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121513' : '#f5f6f2')
}

apply(current)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => apply(current))

// Iconița aleasă: în tab, pentru „Add to Home Screen” pe iPhone și în manifestul citit de Android la instalare.
function applyIcon(p) {
  const key = iconKey(p.icon, p.iconColor)
  const isDefault = key === iconKey(DEFAULT_ICON.design, DEFAULT_ICON.color)
  link('icon').href = iconDataUrl(p.icon, p.iconColor)
  link('apple-touch-icon').href = `/icons/${key}-apple.png`
  // Manifestul implicit e cel generat la build; pentru celelalte combinații există fișiere separate.
  const m = link('manifest')
  if (!m.dataset.original) m.dataset.original = m.getAttribute('href') || '/manifest.webmanifest'
  m.href = isDefault ? m.dataset.original : `/manifests/${key}.webmanifest`
}

function link(rel) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  return el
}