// Lista de cadouri: cine ce rol are și dorințele cu partea lor ascunsă (vezi GiftList.jsx).
import * as api from './data/index.js'

export const isGiftList = (list) => list?.kind === 'gifts'
export const receivesIn = (list, user) => isGiftList(list) && (list.recipients || []).includes(user.email)

// Dorințele, cu partea ascunsă (rezervare, cumpărare, discuția celor care cumpără) pusă peste ele.
export function mergeSecret(items, secret) {
  const byId = new Map(secret.map((s) => [s.id, s]))
  return items.map((i) => {
    const s = byId.get(i.id) || {}
    return {
      ...i,
      status: s.status || 'pending',
      reservedBy: s.reservedBy || null,
      reservedAt: s.reservedAt ?? null,
      resolvedBy: s.resolvedBy || null,
      resolvedAt: s.resolvedAt ?? null,
      secretMsgCount: s.msgCount || 0,
    }
  })
}

export function watchGiftItems(listId, cb, onError) {
  let items = null, secret = null
  const emit = () => { if (items && secret) cb(mergeSecret(items, secret)) }
  const u1 = api.watchItems(listId, (v) => { items = v; emit() }, onError)
  const u2 = api.watchSecret(listId, (v) => { secret = v; emit() }, onError)
  return () => { u1(); u2() }
}
