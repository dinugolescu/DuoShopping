// Formatare de timp relativă, în limba aleasă:
// „azi la 14:30”, „ieri la 09:10”, „marți la 18:00” (ultimele 6 zile),
// apoi „acum o săptămână”, „acum 3 săptămâni”, „acum 2 luni”, „acum peste un an”.
import { t, locale } from './i18n.jsx'

const DAY = 86400000

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
const hhmm = (ms) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })

export function relTime(at, now = Date.now()) {
  if (!at) return ''
  // Math.round compensează zilele de 23/25 de ore la schimbarea orei.
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY)
  if (days <= 0) return t('todayAt', hhmm(at))
  if (days === 1) return t('yesterdayAt', hhmm(at))
  if (days <= 6) return t('weekdayAt', t('weekdays')[new Date(at).getDay()], hhmm(at))
  if (days < 60) return t('weeksAgo', Math.floor(days / 7))
  if (days < 365) return t('monthsAgo', Math.floor(days / 30))
  return t('overAYear')
}

export const fullDate = (at) =>
  at ? new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(at) : ''
