import { POSTPONED } from '../config.js'
import { t } from '../i18n.jsx'

export const normEmail = (e) => String(e || '').trim().toLowerCase()
export const who = (user) => ({ uid: user.uid, name: user.name })

// Reacțiile la mesaje: ID-uri simple ca nume de câmp, emoji doar pentru afișare.
export const REACTIONS = [
  { id: 'like', emoji: '👍' },
  { id: 'love', emoji: '❤️' },
  { id: 'haha', emoji: '😂' },
  { id: 'wow', emoji: '😮' },
  { id: 'ok', emoji: '✅' },
  { id: 'no', emoji: '👎' },
]

export function newItemFields(user, { name, quantity = '', note = '', aisle }) {
  return {
    name: name.trim(),
    quantity: quantity.trim(),
    note: note.trim(),
    aisle,
    status: 'pending', // pending | bought | skipped
    reason: null,
    reasonText: '',
    postponed: 0, // de câte ori a fost amânat
    addedBy: who(user),
    resolvedBy: null,
    resolvedAt: null,
    archived: false,
    msgCount: 0,
    lastMsgAt: null,
    lastMsgBy: null,
  }
}

// Ce se întâmplă cu fiecare produs rezolvat la „Golește rezolvatele”.
export function finishTripChanges(items) {
  return items
    .filter((i) => i.status !== 'pending')
    .map((i) =>
      i.status === 'skipped' && i.reason === POSTPONED
        ? { id: i.id, archive: false, patch: { status: 'pending', reason: null, reasonText: '', resolvedBy: null, resolvedAt: null, postponed: (i.postponed || 0) + 1 } }
        : { id: i.id, archive: true, patch: { archived: true } },
    )
}

// ---------- „Gata, anunță” ----------
// Evenimentele de anunțat sunt ce a făcut `user` pe listă (adăugat, luat, nu s-a luat) și n-a anunțat încă.
// Starea, ținută în cont pentru fiecare listă: `cutoff` (ms; ce e mai vechi e deja anunțat) și `done`
// (cheile evenimentelor mai noi anunțate sau marcate ca anunțate, când alegi doar o parte din ele).
const DAY = 24 * 3600 * 1000
export const FIRST_CUTOFF = () => Date.now() - DAY // la prima folosire nu scoatem la iveală tot istoricul

export function myEvents(items, user, state) {
  const cutoff = state?.cutoff ?? FIRST_CUTOFF()
  const done = new Set(state?.done || [])
  const out = []
  for (const i of items) {
    if (i.addedBy?.uid === user.uid && i.addedAt) out.push({ key: `a:${i.id}:${i.addedAt}`, type: 'added', item: i, at: i.addedAt })
    if (i.status !== 'pending' && i.resolvedBy?.uid === user.uid && i.resolvedAt) {
      out.push({ key: `${i.status[0]}:${i.id}:${i.resolvedAt}`, type: i.status, item: i, at: i.resolvedAt })
    }
  }
  return out.filter((e) => e.at > cutoff && !done.has(e.key)).sort((a, b) => b.at - a.at)
}

// Noua stare după ce evenimentele cu cheile `keys` au fost anunțate (sau marcate ca anunțate).
export function markAnnounced(state, pending, keys) {
  const cutoff = state?.cutoff ?? FIRST_CUTOFF()
  const marked = new Set(keys)
  const left = pending.filter((e) => !marked.has(e.key))
  if (!left.length) {
    // Totul e anunțat: mutăm pragul după ultimul eveniment și golim lista de chei.
    return { cutoff: Math.max(cutoff, ...pending.map((e) => e.at)), done: [] }
  }
  // Rămân unele neanunțate: pragul poate urca doar până înaintea celui mai vechi rămas.
  const oldestLeft = Math.min(...left.map((e) => e.at))
  const newCutoff = Math.max(cutoff, ...pending.filter((e) => e.at < oldestLeft).map((e) => e.at))
  // Cheia se termină cu momentul evenimentului; cele de dinaintea pragului nu mai trebuie ținute.
  const done = [...(state?.done || []), ...keys].filter((k) => Number(k.split(':').pop()) > newCutoff)
  return { cutoff: newCutoff, done: [...new Set(done)] }
}

// Textul anunțului din evenimentele alese. E scris în limba celui care trimite.
const count = (n) => t('sumProducts', n)
function names(list) {
  const shown = list.slice(0, 4).map((i) => i.name).join(', ')
  return t('sumNames', shown, Math.max(0, list.length - 4))
}
export function eventsSummary(events, user) {
  const of = (type) => events.filter((e) => e.type === type).map((e) => e.item)
  const added = of('added'), bought = of('bought'), skipped = of('skipped')
  const parts = []
  if (added.length) parts.push(t('sumAdded', count(added.length), names(added)))
  if (bought.length) parts.push(t('sumBought', count(bought.length)))
  if (skipped.length) parts.push(t('sumSkipped', count(skipped.length), names(skipped)))
  const first = String(user.name || '').split(' ')[0]
  return { text: parts.length ? t('sumText', first, parts) : t('sumNothing', first), empty: !parts.length }
}
