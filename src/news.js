// Bulinele de pe liste: ce listă s-a mișcat de la ultima ta vizită (de altcineva).
// „Văzut” se ține pe telefon, ca la discuții; lista deschisă acum se consideră văzută.
import { useEffect, useState } from 'react'
import { store } from './ui.jsx'
import { receivesIn } from './gifts.js'

const KEY = 'liste-vazute'

export function useListNews(lists, current, user) {
  const [seen, setSeen] = useState(() => store.get(KEY, null))

  // Prima dată pe telefon: ce e acum pe liste e deja „văzut”, ca să nu se aprindă totul deodată.
  useEffect(() => {
    if (!lists || seen) return
    const init = Object.fromEntries(lists.map((l) => [l.id, l.lastAt ?? 0]))
    store.set(KEY, init)
    setSeen(init)
  }, [lists, seen])

  // Lista în care ești se vede singură: orice apare cât o ai deschisă nu rămâne bulină.
  const lastAt = current?.lastAt ?? 0
  useEffect(() => {
    if (!current || !seen || (seen[current.id] ?? 0) >= lastAt) return
    const next = { ...seen, [current.id]: lastAt }
    store.set(KEY, next)
    setSeen(next)
  }, [current?.id, lastAt, seen])

  const news = new Set()
  if (lists && seen) {
    for (const l of lists) {
      // Cine primește cadouri nu vede bulina: ce se mișcă acolo e, în mare parte, surpriza.
      if (receivesIn(l, user) || l.id === current?.id) continue
      if ((l.lastAt ?? 0) > (seen[l.id] ?? 0) && l.lastBy !== user.uid) news.add(l.id)
    }
  }
  return { news, any: news.size > 0 }
}
