// Ce vine din „Share” al altor aplicații (doar Android, din aplicația instalată): un link de produs.
// Alegi lista (și, pe o listă de cadouri, pentru cine e), iar produsul se adaugă cu numele ghicit
// din adresă (ca la link-ul lipit), cu titlul paginii ca rezervă, sau „Produs necunoscut N”.
import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { Sheet, useToast } from './ui.jsx'
import { listAisles, guessAisle } from './aisles.js'
import { isGiftList, receivesIn, recipientName } from './gifts.js'
import { findUrl, nameFromUrl, cleanTitle, unknownName, linkHost } from './links.js'
import { IconLink } from './icons.jsx'
import { t } from './i18n.jsx'

// Citit o dată la pornire; adresa se curăță, ca un refresh să nu adauge din nou.
export function sharedFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const keys = ['shared_title', 'shared_text', 'shared_url']
  if (!keys.some((k) => params.has(k))) return null
  const [title, text, url] = keys.map((k) => params.get(k) || '')
  keys.forEach((k) => params.delete(k))
  const rest = params.toString()
  window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : ''))
  const link = findUrl(url) || findUrl(text) || findUrl(title)
  const guess = (link && nameFromUrl(link)) || cleanTitle(title) || (!link && cleanTitle(text)) || ''
  return { link, guess }
}

export function ShareInSheet({ shared, lists, current, user, onDone, onClose }) {
  const toast = useToast()
  const [listId, setListId] = useState(current?.id || lists[0]?.id)
  const list = lists.find((l) => l.id === listId)
  const gift = isGiftList(list)
  const iReceive = receivesIn(list, user)
  const recipients = gift && !iReceive ? list.recipients || [] : []
  const [forId, setForId] = useState(null)
  const [items, setItems] = useState(null)
  const [name, setName] = useState(shared.guess)

  useEffect(() => {
    setItems(null)
    if (!list) return undefined
    return iReceive ? api.watchWishes(list.id, user.uid, setItems) : api.watchItems(list.id, setItems)
  }, [list?.id, iReceive, user.uid])
  useEffect(() => { if (!recipients.includes(forId)) setForId(recipients[0] || null) }, [listId, recipients.join()])

  const needsFor = gift && !iReceive
  const ok = list && items && (!needsFor || forId)

  function add(e) {
    e.preventDefault()
    if (!ok) return
    const n = name.trim() || unknownName(items)
    const link = shared.link || ''
    if (!gift) api.addItem(list.id, user, { name: n, link, aisle: guessAisle(n, listAisles(list)) }, { catalog: false })
    else if (iReceive) api.addItem(list.id, user, { name: n, link, forEmail: user.email, forName: user.name }, { catalog: false })
    else api.addItem(list.id, user, { name: n, link, forEmail: forId, forName: recipientName(list, forId, items), idea: true }, { catalog: false })
    toast(t('sharedAdded', n, list.name))
    onDone(list.id)
  }

  return (
    <Sheet title={t('shareInTitle')} onClose={onClose}>
      <form className="stack" onSubmit={add}>
        {shared.link && <p className="link-chip"><IconLink /> <span className="grow">{linkHost(shared.link)}</span></p>}
        <label>{t('productLabel')}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
            placeholder={items ? unknownName(items) : ''} />
        </label>
        <h3>{t('shareInList')}</h3>
        <div className="choices" role="radiogroup" aria-label={t('shareInList')}>
          {lists.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={l.id === listId}
              className={`choice ${l.id === listId ? 'active' : ''}`} onClick={() => setListId(l.id)}>
              <span>{isGiftList(l) ? '🎁 ' : ''}{l.name}</span>
            </button>
          ))}
        </div>
        {needsFor && (recipients.length ? (
          <div className="gift-for" role="radiogroup" aria-label={t('ideaFor')}>
            <span className="muted small">{t('ideaFor')}</span>
            {recipients.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={forId === r} className={`chip ${forId === r ? 'on' : ''}`}
                onClick={() => setForId(r)}>{recipientName(list, r, items || [])}</button>
            ))}
          </div>
        ) : <p className="muted small">{t('giftNoRecipients')}</p>)}
        <button className="btn primary wide" disabled={!ok}>{t('shareInAdd', list?.name || '')}</button>
      </form>
    </Sheet>
  )
}
