// Traducerile. Limba se alege din Setări (preferința `lang`, salvată și în cont) și e română implicit.
// `t('cheie', ...argumente)` întoarce textul în limba curentă; valorile pot fi texte, JSX sau funcții
// (pentru numere, nume etc.). O cheie care lipsește din engleză cade pe română.
// Componentele nu se abonează individual: rădăcina aplicației ascultă preferințele (usePrefs) și
// re-randează tot arborele când se schimbă limba.
import { getPref } from './prefs.js'
import ro from './locales/ro.jsx'
import en from './locales/en.jsx'

export const LANGS = [
  { id: 'ro', label: 'Română', locale: 'ro-RO', speech: 'ro-RO' },
  { id: 'en', label: 'English', locale: 'en-GB', speech: 'en-GB' },
]
const DICTS = { ro, en }

export const lang = () => (DICTS[getPref('lang')] ? getPref('lang') : 'ro')
const info = () => LANGS.find((l) => l.id === lang())
export const locale = () => info().locale
export const speechLang = () => info().speech

export function t(key, ...args) {
  const v = DICTS[lang()][key] ?? ro[key]
  if (v === undefined) {
    if (import.meta.env.DEV) console.warn('i18n: lipsește cheia', key)
    return key
  }
  return typeof v === 'function' ? v(...args) : v
}

if (import.meta.env.DEV) {
  const missing = Object.keys(ro).filter((k) => !(k in en))
  if (missing.length) console.warn('i18n: chei fără traducere în engleză:', missing)
}
