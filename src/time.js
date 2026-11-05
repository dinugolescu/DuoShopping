// Formatare de timp relativă, în română:
// „azi la 14:30”, „ieri la 09:10”, „marți la 18:00” (ultimele 6 zile),
// apoi „acum o săptămână”, „acum 3 săptămâni”, „acum 2 luni”, „acum peste un an”.

const WEEKDAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă']
const DAY = 86400000

const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
const hhmm = (t) => new Date(t).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })

export function relTime(t, now = Date.now()) {
  if (!t) return ''
  // Math.round compensează zilele de 23/25 de ore la schimbarea orei.
  const days = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
  if (days <= 0) return `azi la ${hhmm(t)}`
  if (days === 1) return `ieri la ${hhmm(t)}`
  if (days <= 6) return `${WEEKDAYS[new Date(t).getDay()]} la ${hhmm(t)}`
  if (days < 60) {
    const w = Math.floor(days / 7)
    return w === 1 ? 'acum o săptămână' : `acum ${w} săptămâni`
  }
  if (days < 365) {
    const m = Math.floor(days / 30)
    return `acum ${m} luni`
  }
  return 'acum peste un an'
}

export const fullDate = (t) =>
  t ? new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(t) : ''
