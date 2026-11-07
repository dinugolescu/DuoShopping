// Lista de cadouri (ex. dorințele copiilor pentru Crăciun). Două roluri:
// - cine primește cadouri își scrie dorințele și le vede doar pe ale lui, fără să afle ce s-a luat;
// - cine cumpără vede toate dorințele, grupate pe persoană, cu „Iau eu” / „Cumpărat”, idei ascunse
//   și două discuții: una cu cel care primește, una doar între cei care cumpără.
// Ce e ascuns stă în colecția `secret`, pe care regulile Firebase nu o dau celor care primesc.
import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { relTime } from './time.js'
import { Sheet, firstName, useNow, useToast, errText } from './ui.jsx'
import { ChatSheet } from './Chat.jsx'
import { AddForm } from './ListView.jsx'
import { IconChat, IconLock, IconLink } from './icons.jsx'
import { t } from './i18n.jsx'
import { receivesIn, watchGiftItems } from './gifts.js'

const safeLink = (url) => (/^https?:\/\//i.test(url || '') ? url : null)

export function GiftListView({ list, user }) {
  return receivesIn(list, user) ? <WishView list={list} user={user} /> : <BuyerView list={list} user={user} />
}

// ---------- Cine primește cadouri: doar dorințele lui ----------

function WishView({ list, user }) {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [chatId, setChatId] = useState(null)
  useEffect(() => api.watchWishes(list.id, user.uid, setItems, (e) => toast(errText(e))), [list.id, user.uid, toast])

  if (!items) return <div className="center muted">{t('loading')}</div>
  const wishes = items.filter((i) => !i.removed).sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  const editing = wishes.find((i) => i.id === editingId)
  const chatting = wishes.find((i) => i.id === chatId)

  const add = ({ name, quantity = '' }) => {
    api.addItem(list.id, user, { name: name.trim(), quantity, forEmail: user.email, forName: user.name }, { catalog: false })
    return true
  }
  const addMany = (products) => {
    products.forEach(add)
    toast(t('addedMany', products.map((p) => p.name).join(', ')))
    return true
  }

  return (
    <main className="list">
      <p className="gift-hint">🎁 {t('wishHint')}</p>
      <AddForm onAdd={add} onAddMany={addMany} products={[]} pending={[]} enabled={false} placeholder={t('wishPh')} />
      {wishes.length === 0 ? (
        <p className="center muted pad">{t('wishEmpty')}</p>
      ) : (
        <ul className="items">
          {wishes.map((w) => (
            <li key={w.id} className="item">
              <button className="item-body" onClick={() => setEditingId(w.id)}>
                <span className="item-name">{w.name}{w.quantity && <span className="qty-tag">{w.quantity}</span>}</span>
                {w.note && <span className="item-note">{w.note}</span>}
              </button>
              {safeLink(w.link) && (
                <a className="chat-btn" href={w.link} target="_blank" rel="noopener noreferrer" aria-label={t('openLink', w.name)}><IconLink /></a>
              )}
              <button className={`chat-btn ${w.msgCount ? 'has' : ''}`} onClick={() => setChatId(w.id)} aria-label={t('wishChat', w.name)}>
                <IconChat />
                {w.msgCount > 0 && <span className="chat-count">{w.msgCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <WishEditSheet list={list} item={editing} onClose={() => setEditingId(null)}
          onRemove={() => { api.updateItem(list.id, editing.id, { removed: true }); setEditingId(null) }} />
      )}
      {chatting && <ChatSheet list={list} item={chatting} user={user} onClose={() => setChatId(null)} />}
    </main>
  )
}

// ---------- Cine cumpără: toate dorințele, pe persoane ----------

function BuyerView({ list, user }) {
  const toast = useToast()
  const now = useNow()
  const [items, setItems] = useState(null)
  const recipients = list.recipients || []
  const [forEmail, setForEmail] = useState(recipients[0] || null)
  const [editingId, setEditingId] = useState(null)
  const [chat, setChat] = useState(null) // { id, scope }
  useEffect(() => watchGiftItems(list.id, setItems, (e) => toast(errText(e))), [list.id, toast])
  useEffect(() => { if (!recipients.includes(forEmail)) setForEmail(recipients[0] || null) }, [recipients.join(), forEmail])

  if (!items) return <div className="center muted">{t('loading')}</div>

  const nameOf = (email) => items.find((i) => i.for === email && i.forName && !i.idea)?.forName
    || items.find((i) => i.for === email && i.forName)?.forName || email.split('@')[0]
  // O dorință scoasă de cel care o voia rămâne doar dacă cineva a rezervat-o sau a luat-o deja.
  const visible = items.filter((i) => !i.removed || i.status !== 'pending')
  const order = { pending: 0, reserved: 1, bought: 2 }
  const sorted = [...visible].sort((a, b) => order[a.status] - order[b.status] || (b.addedAt ?? 0) - (a.addedAt ?? 0))
  const groups = [
    ...recipients.map((e) => ({ key: e, name: nameOf(e), items: sorted.filter((i) => i.for === e) })),
    { key: '-', name: t('giftOthers'), items: sorted.filter((i) => !recipients.includes(i.for)) },
  ].filter((g) => g.items.length || g.key !== '-')

  const editing = items.find((i) => i.id === editingId)
  const chatting = chat && items.find((i) => i.id === chat.id)

  const add = ({ name, quantity = '' }) => {
    if (!forEmail) return false
    api.addItem(list.id, user, { name: name.trim(), quantity, forEmail, forName: nameOf(forEmail), idea: true }, { catalog: false })
    return true
  }
  const addMany = (products) => {
    if (!forEmail) return false
    products.forEach(add)
    toast(t('addedMany', products.map((p) => p.name).join(', ')))
    return true
  }
  const setStatus = (item, status, msg) => {
    const prev = item.status
    api.setGiftStatus(list.id, item.id, user, status)
    if (msg) toast(msg, () => api.setGiftStatus(list.id, item.id, user, prev))
  }

  return (
    <main className="list">
      {recipients.length === 0 ? (
        <p className="gift-hint">🎁 {t('giftNoRecipients')}</p>
      ) : (
        <>
          <div className="gift-for" role="radiogroup" aria-label={t('ideaFor')}>
            <span className="muted small">{t('ideaFor')}</span>
            {recipients.map((e) => (
              <button key={e} role="radio" aria-checked={forEmail === e} className={`chip ${forEmail === e ? 'on' : ''}`}
                onClick={() => setForEmail(e)}>{nameOf(e)}</button>
            ))}
          </div>
          <AddForm onAdd={add} onAddMany={addMany} products={[]} pending={[]} enabled={false}
            placeholder={forEmail ? t('ideaPh', nameOf(forEmail)) : undefined} />
        </>
      )}

      {groups.map((g) => (
        <section key={g.key} className="aisle">
          <h3 className="aisle-head"><span aria-hidden="true">🎁</span> {g.name} <span className="muted">{g.items.length}</span></h3>
          {g.items.length === 0 ? (
            <p className="muted small pad-x">{t('noWishesYet', g.name)}</p>
          ) : (
            <ul className="items">
              {g.items.map((i) => (
                <GiftRow key={i.id} item={i} user={user} now={now} kid={g.name}
                  onEdit={() => setEditingId(i.id)}
                  onChat={(scope) => setChat({ id: i.id, scope })}
                  onReserve={() => setStatus(i, 'reserved', t('reservedToast', i.name))}
                  onBought={() => setStatus(i, 'bought', t('toastBought', i.name))}
                  onRelease={() => setStatus(i, 'pending', t('releasedToast', i.name))} />
              ))}
            </ul>
          )}
        </section>
      ))}

      {editing && (
        <WishEditSheet list={list} item={editing} buyer recipients={recipients} nameOf={nameOf} onClose={() => setEditingId(null)}
          onRemove={() => {
            if (!window.confirm(t('deleteItemConfirm', editing.name, !!(editing.msgCount || editing.secretMsgCount)))) return
            api.deleteItem(list.id, editing, { gift: true })
            setEditingId(null)
          }} />
      )}
      {chatting && <ChatSheet list={list} item={chatting} user={user} scope={chat.scope} onClose={() => setChat(null)} />}
    </main>
  )
}

function GiftRow({ item, user, now, kid, onEdit, onChat, onReserve, onBought, onRelease }) {
  const mine = item.reservedBy?.uid === user.uid
  const by = firstName(item.reservedBy?.name)
  let meta = item.idea ? t('ideaBy', firstName(item.addedBy?.name)) : relTime(item.addedAt, now)
  if (item.removed) meta = t('removedBy', kid)
  return (
    <li className={`item gift ${item.status}`}>
      <button className="item-body" onClick={onEdit}>
        <span className="item-name">
          {item.name}
          {item.quantity && <span className="qty-tag">{item.quantity}</span>}
          {item.idea && <span className="badge">{t('ideaBadge')}</span>}
        </span>
        {item.note && <span className="item-note">{item.note}</span>}
        <span className={`item-meta ${item.removed ? 'warn' : ''}`}>{meta}</span>
        {item.status === 'reserved' && <span className="gift-status">{mine ? t('reservedByMe') : t('reservedBy', by)}</span>}
        {item.status === 'bought' && <span className="gift-status done">{t('giftBoughtBy', by)}</span>}
      </button>
      <div className="gift-actions">
        <div className="gift-icons">
          {safeLink(item.link) && (
            <a className="chat-btn" href={item.link} target="_blank" rel="noopener noreferrer" aria-label={t('openLink', item.name)}><IconLink /></a>
          )}
          <button className={`chat-btn ${item.msgCount ? 'has' : ''}`} onClick={() => onChat()} aria-label={t('chatWithKid', item.name, kid)}>
            <IconChat />{item.msgCount > 0 && <span className="chat-count">{item.msgCount}</span>}
          </button>
          <button className={`chat-btn ${item.secretMsgCount ? 'has' : ''}`} onClick={() => onChat('secret')} aria-label={t('secretChatAbout', item.name)}>
            <IconLock />{item.secretMsgCount > 0 && <span className="chat-count">{item.secretMsgCount}</span>}
          </button>
        </div>
        {item.status === 'pending' && <button className="btn small primary" onClick={onReserve}>{t('reserve')}</button>}
        {item.status === 'reserved' && mine && (
          <>
            <button className="btn small primary" onClick={onBought}>{t('markBoughtShort')}</button>
            <button className="btn small" onClick={onRelease}>{t('release')}</button>
          </>
        )}
        {item.status === 'bought' && mine && <button className="btn small" onClick={onRelease}>{t('undo')}</button>}
      </div>
    </li>
  )
}

// Corectarea unei dorințe. Cine cumpără mai poate schimba pentru cine e și o poate șterge de tot;
// cine primește o scoate doar de la el (cei care cumpără o mai văd, dacă au luat-o deja).
function WishEditSheet({ list, item, buyer, recipients, nameOf, onClose, onRemove }) {
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.quantity || '')
  const [note, setNote] = useState(item.note || '')
  const [link, setLink] = useState(item.link || '')
  const [forEmail, setForEmail] = useState(item.for || '')

  function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    const patch = { name: name.trim(), quantity: qty.trim(), note: note.trim(), link: link.trim() }
    if (buyer && forEmail && forEmail !== item.for) Object.assign(patch, { for: forEmail, forName: nameOf(forEmail) })
    api.updateItem(list.id, item.id, patch)
    onClose()
  }
  const badLink = link.trim() && !safeLink(link.trim())

  return (
    <Sheet title={buyer ? t('editTitle') : t('wishEditTitle')} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label>{t('wishLabel')}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
        <label>{t('qtyLabel')}<input value={qty} onChange={(e) => setQty(e.target.value)} maxLength={20} placeholder={t('wishQtyEx')} /></label>
        <label>{t('note')}<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t('wishNoteEx')} /></label>
        <label>{t('linkLabel')}<input type="url" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500}
          placeholder="https://…" autoCapitalize="off" /></label>
        {badLink && <p className="error small">{t('linkInvalid')}</p>}
        {buyer && recipients.length > 1 && (
          <label>{t('ideaFor')}
            <select value={forEmail} onChange={(e) => setForEmail(e.target.value)}>
              {recipients.map((r) => <option key={r} value={r}>{nameOf(r)}</option>)}
            </select>
          </label>
        )}
        {!buyer && <p className="muted small">{t('wishPhotoHint')}</p>}
        <div className="row">
          <button type="button" className="btn danger" onClick={onRemove}>{buyer ? t('delete') : t('removeWish')}</button>
          <button className="btn primary grow" disabled={!name.trim() || badLink}>{t('save')}</button>
        </div>
      </form>
    </Sheet>
  )
}
