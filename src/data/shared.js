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

// Rezumatul pentru „Gata, anunță”: ce a făcut `user` pe listă de la momentul `since` (ms).
// E scris în limba celui care trimite.
const count = (n) => t('sumProducts', n)
function names(list) {
  const shown = list.slice(0, 4).map((i) => i.name).join(', ')
  return t('sumNames', shown, Math.max(0, list.length - 4))
}
export function sessionSummary(items, user, since) {
  const mine = (by, at) => by?.uid === user.uid && (at ?? 0) > since
  const added = items.filter((i) => mine(i.addedBy, i.addedAt))
  const bought = items.filter((i) => i.status === 'bought' && mine(i.resolvedBy, i.resolvedAt))
  const skipped = items.filter((i) => i.status === 'skipped' && mine(i.resolvedBy, i.resolvedAt))
  const parts = []
  if (added.length) parts.push(t('sumAdded', count(added.length), names(added)))
  if (bought.length) parts.push(t('sumBought', count(bought.length)))
  if (skipped.length) parts.push(t('sumSkipped', count(skipped.length), names(skipped)))
  const first = String(user.name || '').split(' ')[0]
  return { text: parts.length ? t('sumText', first, parts) : t('sumNothing', first), empty: !parts.length }
}