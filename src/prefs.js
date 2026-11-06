// Preferințe salvate pe fiecare telefon în parte (localStorage).
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

const DEFAULTS = { theme: 'auto', font: 'system', suggestions: true, groupByAisle: true, icon: DEFAULT_ICON.design, iconColor: DEFAULT_ICON.color }
const KEY = 'cumparaturi-prefs'

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return { ...DEFAULTS } }
}

let current = load()
const subs = new Set()

export function setPref(key, value) {
  current = { ...current, [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* ignorăm */ }
  apply(current)
  subs.forEach((f) => f(current))
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