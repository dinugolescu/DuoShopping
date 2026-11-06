import { useEffect, useMemo, useRef, useState } from 'react'
import * as api from './data/index.js'
import { SKIP_REASONS, CUSTOM, reasonLabel } from './config.js'
import { listAisles, aisleIn, guessAisle, normalize, productKey } from './aisles.js'
import { relTime, fullDate } from './time.js'
import { usePrefs } from './prefs.js'
import { Sheet, firstName, store, useNow, useToast, errText } from './ui.jsx'
import { ChatSheet } from './Chat.jsx'
import { sendAnnounce, atShopText } from './sheets.jsx'
import { IconCheck, IconX, IconPlus, IconChevron, IconChat } from './icons.jsx'

const SEEN_KEY = 'mesaje-vazute'
const itemAisle = (i, aisles) => aisleIn(aisles, i.aisle || guessAisle(i.name, aisles))

export function ListView({ list, user }) {
  const toast = useToast()
  const prefs = usePrefs()
  const now = useNow()
  const [items, setItems] = useState(null)
  const [products, setProducts] = useState([])
  const [skipping, setSkipping] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [chatId, setChatId] = useState(null)
  const [showDone, setShowDone] = useState(true)
  const [seen, setSeen] = useState(() => store.get(SEEN_KEY, {}))

  useEffect(() => api.watchItems(list.id, setItems, (e) => toast(errText(e))), [list.id, toast])
  useEffect(() => api.watchProducts(list.id, setProducts), [list.id])

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const aisles = listAisles(list)

  if (!items) return <div className="center muted">Se încarcă…</div>

  const pending = items.filter((i) => i.status === 'pending').sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  const done = items.filter((i) => i.status !== 'pending').sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
  const editing = items.find((i) => i.id === editingId)
  const chatting = items.find((i) => i.id === chatId)

  const unread = (i) => i.msgCount > 0 && i.lastMsgBy !== user.uid && (i.lastMsgAt ?? 0) > (seen[i.id] ?? 0)

  function change(item, status, reason = null, reasonText = '') {
    const prev = [item.status, item.reason ?? null, item.reasonText ?? '']
    api.setStatus(list.id, item.id, user, status, reason, reasonText)
    const text = status === 'bought' ? `„${item.name}” cumpărat`
      : status === 'skipped' ? `„${item.name}”: ${reasonLabel({ reason, reasonText })}`
      : `„${item.name}” e din nou pe listă`
    toast(text, () => api.setStatus(list.id, item.id, user, ...prev))
  }

  function add({ name, quantity = '' }) {
    const n = name.trim()
    const dup = pending.find((i) => normalize(i.name) === normalize(n))
    if (dup) { toast(`„${dup.name}” e deja pe listă`); return false }
    const known = productMap.get(productKey(n))
    const aisle = known?.aisle && aisles.some((a) => a.id === known.aisle) ? known.aisle : guessAisle(n, aisles)
    api.addItem(list.id, user, { name: n, quantity, aisle })
    return true
  }

  function finish() {
    if (!window.confirm(`Scoți de pe listă cele ${done.length} produse rezolvate? Cele amânate rămân pe listă.`)) return
    api.finishTrip(list.id, done)
    toast('Listă curățată')
  }

  function openChat(item) {
    setEditingId(null)
    setChatId(item.id)
  }

  function closeChat() {
    if (chatting) {
      const next = { ...seen, [chatting.id]: Date.now() }
      // Păstrăm doar produsele care încă există, ca lista să nu crească la nesfârșit.
      for (const k of Object.keys(next)) if (!items.some((i) => i.id === k)) delete next[k]
      setSeen(next)
      store.set(SEEN_KEY, next)
    }
    setChatId(null)
  }

  const row = (i) => (
    <ItemRow key={i.id} item={i} now={now} unread={unread(i)}
      onCheck={() => change(i, i.status === 'pending' ? 'bought' : 'pending')}
      onSkip={() => setSkipping(i)}
      onEdit={() => setEditingId(i.id)}
      onChat={() => openChat(i)} />
  )

  const groups = prefs.groupByAisle
    ? aisles.map((a) => ({ aisle: a, items: pending.filter((i) => itemAisle(i, aisles) === a.id) })).filter((g) => g.items.length)
    : null

  return (
    <main className="list">
      <AddForm onAdd={add} products={products} pending={pending} enabled={prefs.suggestions} />
      <ShopMode list={list} user={user} pendingCount={pending.length} />

      {pending.length === 0 ? (
        <p className="center muted pad">{done.length ? 'Gata, totul e rezolvat!' : 'Lista e goală. Adaugă primul produs mai sus.'}</p>
      ) : groups ? (
        groups.map((g) => (
          <section key={g.aisle.id} className="aisle">
            <h3 className="aisle-head"><span aria-hidden="true">{g.aisle.icon}</span> {g.aisle.label} <span className="muted">{g.items.length}</span></h3>
            <ul className="items">{g.items.map(row)}</ul>
          </section>
        ))
      ) : (
        <ul className="items">{pending.map(row)}</ul>
      )}

      {done.length > 0 && (
        <section className="done">
          <div className="done-head">
            <button className="done-toggle" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
              <IconChevron className={showDone ? '' : 'rot'} /> Rezolvate ({done.length})
            </button>
            <button className="btn small" onClick={finish}>Golește rezolvatele</button>
          </div>
          {showDone && <ul className="items">{done.map(row)}</ul>}
        </section>
      )}

      {skipping && (
        <SkipSheet item={skipping} onClose={() => setSkipping(null)}
          onPick={(reason, text) => { change(skipping, 'skipped', reason, text); setSkipping(null) }} />
      )}
      {editing && (
        <EditSheet list={list} aisles={aisles} item={editing} onClose={() => setEditingId(null)} onChat={() => openChat(editing)} />
      )}
      {chatting && <ChatSheet list={list} item={chatting} user={user} onClose={closeChat} />}
    </main>
  )
}

function AddForm({ onAdd, products, pending, enabled }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const ref = useRef()

  const suggestions = useMemo(() => {
    const q = normalize(name)
    if (!enabled || q.length < 2) return []
    const onList = new Set(pending.map((i) => normalize(i.name)))
    return products
      .map((p) => ({ p, n: normalize(p.name) }))
      .filter(({ n }) => n.includes(q) && n !== q && !onList.has(n))
      .sort((a, b) => (b.n.startsWith(q) - a.n.startsWith(q)) || ((b.p.count || 0) - (a.p.count || 0)))
      .slice(0, 5)
      .map(({ p }) => p)
  }, [name, products, pending, enabled])

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (onAdd({ name, quantity: qty })) { setName(''); setQty('') }
    ref.current?.focus()
  }

  function pick(p) {
    if (onAdd({ name: p.name, quantity: qty || p.quantity || '' })) { setName(''); setQty('') }
    ref.current?.focus()
  }

  return (
    <div className="add-wrap">
      <form className="add" onSubmit={submit}>
        <input ref={ref} className="add-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ce trebuie cumpărat?" maxLength={120} enterKeyHint="done" autoComplete="off" aria-label="Produs" />
        <input className="add-qty" value={qty} onChange={(e) => setQty(e.target.value)}
          placeholder="Cant." maxLength={20} enterKeyHint="done" autoComplete="off" aria-label="Cantitate" />
        <button className="add-btn" disabled={!name.trim()} aria-label="Adaugă"><IconPlus /></button>
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions" aria-label="Sugestii din istoric">
          {suggestions.map((p) => (
            <button key={p.id} type="button" className="chip" onClick={() => pick(p)}>
              {p.name}{p.quantity && <span className="muted"> · {p.quantity}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, now, unread, onCheck, onSkip, onEdit, onChat }) {
  const isDone = item.status !== 'pending'
  let meta
  if (item.status === 'bought') meta = `cumpărat de ${firstName(item.resolvedBy?.name)} · ${relTime(item.resolvedAt, now)}`
  else if (item.status === 'skipped') meta = `${reasonLabel(item)} · ${firstName(item.resolvedBy?.name)}`
  else meta = `${firstName(item.addedBy?.name)} · ${relTime(item.addedAt, now)}` + (item.postponed ? ` · amânat ${item.postponed}×` : '')

  return (
    <li className={`item ${item.status}`}>
      <button className="check" onClick={onCheck}
        aria-label={isDone ? `Pune „${item.name}” înapoi pe listă` : `Marchează „${item.name}” cumpărat`}>
        {item.status === 'bought' && <IconCheck />}
        {item.status === 'skipped' && <IconX />}
      </button>
      <button className="item-body" onClick={onEdit}>
        <span className="item-name">
          {item.name}
          {item.quantity && <span className="qty-tag">{item.quantity}</span>}
        </span>
        {item.note && <span className="item-note">{item.note}</span>}
        <span className="item-meta">{meta}</span>
      </button>
      {(!isDone || item.msgCount > 0) && (
        <button className={`chat-btn ${item.msgCount ? 'has' : ''}`} onClick={onChat}
          aria-label={`Discuție despre „${item.name}”${item.msgCount ? `, ${item.msgCount} mesaje` : ''}${unread ? ', mesaje noi' : ''}`}>
          <IconChat />
          {item.msgCount > 0 && <span className="chat-count">{item.msgCount}</span>}
          {unread && <span className="dot" />}
        </button>
      )}
      {!isDone && <button className="skip-btn" onClick={onSkip}>Nu iau</button>}
    </li>
  )
}

function SkipSheet({ item, onPick, onClose }) {
  const [text, setText] = useState('')
  return (
    <Sheet title={`De ce nu iei „${item.name}”?`} onClose={onClose}>
      <div className="choices">
        {SKIP_REASONS.map((r) => (
          <button key={r.id} className="choice" onClick={() => onPick(r.id, '')}>{r.label}</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onPick(CUSTOM, text.trim()) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Alt motiv…" maxLength={80} />
        <button className="btn" disabled={!text.trim()}>Salvează</button>
      </form>
    </Sheet>
  )
}

function EditSheet({ list, aisles, item, onClose, onChat }) {
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.quantity || '')
  const [note, setNote] = useState(item.note || '')
  const [aisle, setAisle] = useState(itemAisle(item, aisles))

  function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    api.updateItem(list.id, item.id, { name: name.trim(), quantity: qty.trim(), note: note.trim() })
    // Raionul ales de mână se ține minte în catalog, pentru data viitoare.
    if (aisle !== item.aisle) api.setItemAisle(list.id, { ...item, name: name.trim() }, aisle)
    onClose()
  }
  function remove() {
    if (!window.confirm(`Ștergi „${item.name}”${item.msgCount ? ' și discuția lui' : ''}?`)) return
    api.deleteItem(list.id, item)
    onClose()
  }
  return (
    <Sheet title="Modifică produsul" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label>Produs<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
        <div className="row tight">
          <label className="grow">Cantitate<input value={qty} onChange={(e) => setQty(e.target.value)} maxLength={20} placeholder="ex. 2 buc" /></label>
          <label className="grow">Raion
            <select value={aisle} onChange={(e) => setAisle(e.target.value)}>
              {aisles.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
            </select>
          </label>
        </div>
        <label>Notă<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ex. marca X, fără lactoză" /></label>
        <button type="button" className="btn wide-left" onClick={onChat}>
          <IconChat /> {item.msgCount ? `Discuție (${item.msgCount} mesaje)` : 'Întreabă ceva despre produs'}
        </button>
        <p className="muted small">
          Adăugat de {item.addedBy?.name} {fullDate(item.addedAt) && `· ${fullDate(item.addedAt)}`}
          {item.resolvedBy && <><br />{item.status === 'bought' ? 'Cumpărat' : 'Rezolvat'} de {item.resolvedBy.name} · {fullDate(item.resolvedAt)}</>}
        </p>
        <div className="row">
          <button type="button" className="btn danger" onClick={remove}>Șterge</button>
          <button className="btn primary grow" disabled={!name.trim()}>Salvează</button>
        </div>
      </form>
    </Sheet>
  )
}

// ---------- Mod magazin: ecranul rămâne aprins, doar la cerere ----------
// Telefonul eliberează singur ecranul când aplicația trece în fundal sau blochezi telefonul.
// În plus, modul se oprește singur după 10 minute fără nicio atingere și când lista e gata,
// ca să nu se descarce bateria dacă telefonul ajunge în buzunar cu aplicația deschisă.

const IDLE_MS = 10 * 60 * 1000

function ShopMode({ list, user, pendingCount }) {
  const toast = useToast()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!on) return
    let lock = null
    let last = Date.now()
    let timer
    const stop = (msg) => { setOn(false); if (msg) toast(msg) }
    const acquire = async () => {
      try { if (document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen') } catch { /* refuzat */ }
    }
    const arm = () => {
      last = Date.now()
      clearTimeout(timer)
      timer = setTimeout(() => stop('Mod magazin oprit după 10 minute fără activitate'), IDLE_MS)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last > IDLE_MS) stop('Mod magazin oprit după 10 minute fără activitate')
      else acquire()
    }
    acquire()
    arm()
    document.addEventListener('visibilitychange', onVisible)
    document.addEventListener('pointerdown', arm)
    document.addEventListener('keydown', arm)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('pointerdown', arm)
      document.removeEventListener('keydown', arm)
      lock?.release().catch(() => {})
    }
  }, [on, toast])

  useEffect(() => {
    if (on && pendingCount === 0) { setOn(false); toast('Lista e gata: mod magazin oprit') }
  }, [on, pendingCount, toast])

  function start() {
    if (!('wakeLock' in navigator)) { toast('Telefonul ăsta nu permite ținerea ecranului aprins din aplicație'); return }
    setOn(true)
  }

  async function announceShop() {
    setBusy(true)
    const res = await sendAnnounce(list.id, atShopText(user), toast)
    setBusy(false)
    if (!res.ok) toast(res.error)
  }

  if (!on) {
    return pendingCount > 0 ? (
      <button className="shop-start" onClick={start}>🛒 Mod magazin <span className="muted small">ecranul rămâne aprins</span></button>
    ) : null
  }
  return (
    <div className="shop-bar" role="status">
      <span className="grow">🛒 Mod magazin: ecranul rămâne aprins</span>
      {list.memberEmails.length > 1 && (
        <button className="btn small" disabled={busy} onClick={announceShop}>Anunță că sunt aici</button>
      )}
      <button className="btn small" onClick={() => setOn(false)}>Oprește</button>
    </div>
  )
}
