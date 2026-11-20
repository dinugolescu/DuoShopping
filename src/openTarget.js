// Locul cerut de o notificare: lista, produsul și discuția lui (`scope`: obișnuită sau 'secret').
// Vine din adresă (`?list=&item=&scope=`) sau de la service worker; lista care are produsul îl ia și deschide
// discuția. Dacă lista e deja deschisă, o anunțăm prin abonare; dacă se deschide abia acum, își ia locul la montare.
import { useEffect, useRef } from 'react'

let target = null
const subs = new Set()

export function setOpenTarget(next) {
  target = next && next.itemId ? next : null
  subs.forEach((f) => f())
}

export function useOpenTarget(listId, onTarget) {
  const cb = useRef(onTarget)
  cb.current = onTarget
  useEffect(() => {
    const check = () => {
      if (target && target.listId === listId) {
        const tg = target
        target = null
        cb.current(tg)
      }
    }
    check()
    subs.add(check)
    return () => subs.delete(check)
  }, [listId])
}
