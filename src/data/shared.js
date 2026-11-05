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
