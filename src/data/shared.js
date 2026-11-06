import { POSTPONED } from '../config.js'

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
const count = (n) => (n === 1 ? '1 produs' : `${n} produse`)
function names(list) {
  const shown = list.slice(0, 4).map((i) => i.name)
  return list.length > 4 ? `${shown.join(', ')} și încă ${list.length - 4}` : shown.join(', ')
}
export function sessionSummary(items, user, since) {
  const mine = (by, at) => by?.uid === user.uid && (at ?? 0) > since
  const added = items.filter((i) => mine(i.addedBy, i.addedAt))
  const bought = items.filter((i) => i.status === 'bought' && mine(i.resolvedBy, i.resolvedAt))
  const skipped = items.filter((i) => i.status === 'skipped' && mine(i.resolvedBy, i.resolvedAt))
  const parts = []
  if (added.length) parts.push(`a adăugat ${count(added.length)}: ${names(added)}`)
  if (bought.length) parts.push(`a cumpărat ${count(bought.length)}`)
  if (skipped.length) parts.push(`n-a găsit ${count(skipped.length)}: ${names(skipped)}`)
  const first = String(user.name || '').split(' ')[0]
  return { text: parts.length ? `${first} ${parts.join('; ')}.` : `${first} a actualizat lista.`, empty: !parts.length }
}