import { useEffect, useMemo, useRef, useState } from 'react'
import * as api from './data/index.js'
import { SKIP_REASONS, CUSTOM, reasonLabel } from './config.js'
import { listAisles, aisleIn, aisleLabel, guessAisle, normalize, productKey } from './aisles.js'

import { relTime, fullDate } from './time.js'
import { usePrefs } from './prefs.js'
import { Sheet, firstName, store, useNow, useToast, errText } from './ui.jsx'
import { ChatSheet } from './Chat.jsx'
import { sendAnnounce, atShopText } from './sheets.jsx'
import { IconCheck, IconX, IconPlus, IconChevron, IconChat, IconMic } from './icons.jsx'
import { speechSupported, listen, speechErrText, parseProducts, hasSpokenAnd } from './voice.js'
import { t } from './i18n.jsx'

const SEEN_KEY = 'mesaje-vazute'
const KEYBOARD_VOICE_KEY = 'voce-prin-tastatura'
export const sameProduct = (a, b) => normalize(a.name) === normalize(b.name) && normalize(a.quantity || '') === normalize(b.quantity || '')
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

  if (!items) return <div className="center muted">{t('loading')}</div>

  const pending = items.filter((i) => i.status === 'pending').sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  const done = items.filter((i) => i.status !== 'pending').sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
  const editing = items.find((i) => i.id === editingId)
  const chatting = items.find((i) => i.id === chatId)

  const unread = (i) => i.msgCount > 0 && i.lastMsgBy !== user.uid && (i.lastMsgAt ?? 0) > (seen[i.id] ?? 0)

  function change(item, status, reason = null, reasonText = '') {
    const prev = [item.status, item.reason ?? null, item.reasonText ?? '']
    api.setStatus(list.id, item.id, user, status, reason, reasonText)
    const text = status === 'bought' ? t('toastBought', item.name)
      : status === 'skipped' ? t('toastSkipped', item.name, reasonLabel({ reason, reasonText }))
      : t('toastBack', item.name)
    toast(text, () => api.setStatus(list.id, item.id, user, ...prev))
  }

  // Același produs cu aceeași cantitate e deja pe listă; cu altă cantitate sau marcă („Țigări · Kent”)
  // e alt produs. Un duplicat adevărat se poate adăuga totuși, din toast.
  function add({ name, quantity = '' }, quiet = false, force = false) {
    const n = name.trim()
    const dup = !force && pending.find((i) => sameProduct(i, { name: n, quantity }))
    if (dup) {
      if (!quiet) toast(t('alreadyOnList', dup.name), () => add({ name: n, quantity }, true, true), t('addAnyway'))
      return false
    }
    const known = productMap.get(productKey(n))
    const aisle = known?.aisle && aisles.some((a) => a.id === known.aisle) ? known.aisle : guessAisle(n, aisles)
    api.addItem(list.id, user, { name: n, quantity, aisle })
    return true
  }

  // Mai multe produse deodată (din voce sau din text cu virgule).
  function addMany(products) {
    const seen = new Set()
    const added = [], already = []
    for (const p of products) {
      const k = `${normalize(p.name)}|${normalize(p.quantity || '')}`
      if (seen.has(k)) continue
      seen.add(k)
      ;(add(p, true) ? added : already).push(p.name)
    }
    const parts = []
    if (added.length) parts.push(t('addedMany', added.join(', ')))
    if (already.length) parts.push(t('alreadyMany', already.join(', ')))
    toast(parts.join('; ') || t('noneFound'))
    return added.length > 0
  }

  function finish() {
    if (!window.confirm(t('finishConfirm', done.length))) return
    api.finishTrip(list.id, done)
    toast(t('listCleared'))
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
      <AddForm onAdd={add} onAddMany={addMany} products={products} pending={pending} enabled={prefs.suggestions} />
      <ShopMode list={list} user={user} pendingCount={pending.length} />

      {pending.length === 0 ? (
        <p className="center muted pad">{done.length ? t('allDone') : t('emptyList')}</p>
      ) : groups ? (
        groups.map((g) => (
          <section key={g.aisle.id} className="aisle">
            <h3 className="aisle-head"><span aria-hidden="true">{g.aisle.icon}</span> {aisleLabel(g.aisle)} <span className="muted">{g.items.length}</span></h3>
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
              <IconChevron className={showDone ? '' : 'rot'} /> {t('resolvedCount', done.length)}
            </button>
            <button className="btn small" onClick={finish}>{t('clearResolved')}</button>
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

export function AddForm({ onAdd, onAddMany, products, pending, enabled, placeholder }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [listening, setListening] = useState(false)
  const [preview, setPreview] = useState(null) // produsele înțelese, de confirmat înainte de adăugare
  const ref = useRef()
  const stop = useRef(null)
  useEffect(() => () => stop.current?.(), [])

  function voice() {
    if (listening) { stop.current?.(); return }
    // Unde microfonul aplicației nu a mers, folosim direct dictarea de pe tastatură.
    if (store.get(KEYBOARD_VOICE_KEY)) {
      ref.current?.focus()
      toast(t('keyboardVoiceHint'))
      return
    }
    setListening(true)
    stop.current = listen({
      onPartial: (text) => setName(text),
      onFinal: (text) => { setName(''); showPreview(parseProducts(text, { spoken: true })) },
      onError: (code) => {
        if (code === 'no-result') { store.set(KEYBOARD_VOICE_KEY, true); ref.current?.focus() }
        const t = speechErrText(code)
        if (t) toast(t)
      },
      onEnd: () => { setListening(false); stop.current = null },
    })
  }

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

  function showPreview(found) {
    if (found.length) setPreview(found)
    else toast(t('noneFound'))
  }

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    // Cu virgule și fără cantitate separată: sunt mai multe produse („lapte, ouă, două pâini”).
    // Unde vocea merge prin tastatură, despărțim și după „și” (dictarea pune rar virgule).
    const spoken = !!store.get(KEYBOARD_VOICE_KEY)
    const many = !qty.trim() && (/[,;]/.test(name) || (spoken && hasSpokenAnd(name))) ? parseProducts(name, { spoken }) : null
    if (many && many.length > 1) { setName(''); setQty(''); setPreview(many); return }
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
          placeholder={listening ? t('listening') : placeholder || t('addPh')} maxLength={120} enterKeyHint="done" autoComplete="off" aria-label={t('productLabel')} />
        <input className="add-qty" value={qty} onChange={(e) => setQty(e.target.value)}
          placeholder={t('qtyPh')} maxLength={20} enterKeyHint="done" autoComplete="off" aria-label={t('qtyLabel')} />
        {speechSupported() && (listening || !name.trim()) ? (
          <button type="button" className={`add-btn mic ${listening ? 'listening' : ''}`} onClick={voice}
            aria-label={listening ? t('stopListening') : t('speakItems')}>
            <IconMic />
          </button>
        ) : (
          <button className="add-btn" disabled={!name.trim()} aria-label={t('add')}><IconPlus /></button>
        )}
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions" aria-label={t('historySuggestions')}>
          {suggestions.map((p) => (
            <button key={p.id} type="button" className="chip" onClick={() => pick(p)}>
              {p.name}{p.quantity && <span className="muted"> · {p.quantity}</span>}
            </button>
          ))}
        </div>
      )}
      {preview && (
        <PreviewSheet found={preview} pending={pending} onClose={() => setPreview(null)}
          onAdd={(list) => { onAddMany(list); setPreview(null) }} />
      )}
    </div>
  )
}

// Ce s-a înțeles din dictare (sau din mai multe produse scrise cu virgulă): le poți corecta sau scoate
// înainte să ajungă pe listă. Cele deja pe listă sunt marcate și nu se adaugă din nou.
function PreviewSheet({ found, pending, onAdd, onClose }) {
  const [rows, setRows] = useState(() => found.map((p, i) => ({ ...p, key: i })))
  const isDup = (r) => r.name.trim() && pending.some((i) => sameProduct(i, r))
  const change = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  const remove = (key) => setRows((r) => r.filter((x) => x.key !== key))
  const valid = rows.filter((r) => r.name.trim())
  const fresh = valid.filter((r) => !isDup(r))

  function submit(e) {
    e.preventDefault()
    if (fresh.length) onAdd(valid.map(({ name, quantity }) => ({ name: name.trim(), quantity: (quantity || '').trim() })))
  }

  return (
    <Sheet title={t('previewTitle')} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted small">{t('previewHint')}</p>
        {rows.length ? (
          <ul className="preview-items">
            {rows.map((r) => {
              const dup = isDup(r)
              return (
                <li key={r.key} className={dup ? 'dup' : ''}>
                  <input className="p-name" value={r.name} onChange={(e) => change(r.key, { name: e.target.value })}
                    maxLength={120} aria-label={t('productLabel')} />
                  <input className="p-qty" value={r.quantity || ''} onChange={(e) => change(r.key, { quantity: e.target.value })}
                    maxLength={20} placeholder={t('qtyPh')} aria-label={t('qtyLabel')} />
                  <button type="button" className="icon-btn" onClick={() => remove(r.key)} aria-label={t('previewRemove', r.name)}>
                    <IconX />
                  </button>
                  {dup && <span className="on-list">{t('previewOnList')}</span>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">{t('previewEmpty')}</p>
        )}
        <div className="row">
          <button type="button" className="btn" onClick={onClose}>{t('previewCancel')}</button>
          <button className="btn primary grow" disabled={!fresh.length}>{t('previewAdd', fresh.length)}</button>
        </div>
      </form>
    </Sheet>
  )
}

function ItemRow({ item, now, unread, onCheck, onSkip, onEdit, onChat }) {
  const isDone = item.status !== 'pending'
  let meta
  if (item.status === 'bought') meta = t('metaBought', firstName(item.resolvedBy?.name), relTime(item.resolvedAt, now))
  else if (item.status === 'skipped') meta = `${reasonLabel(item)} · ${firstName(item.resolvedBy?.name)}`
  else meta = `${firstName(item.addedBy?.name)} · ${relTime(item.addedAt, now)}` + (item.postponed ? t('metaPostponed', item.postponed) : '')

  return (
    <li className={`item ${item.status}`}>
      <button className="check" onClick={onCheck}
        aria-label={isDone ? t('putBack', item.name) : t('markBought', item.name)}>
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
          aria-label={t('chatAbout', item.name, item.msgCount, unread)}>
          <IconChat />
          {item.msgCount > 0 && <span className="chat-count">{item.msgCount}</span>}
          {unread && <span className="dot" />}
        </button>
      )}
      {!isDone && <button className="skip-btn" onClick={onSkip}>{t('skip')}</button>}
    </li>
  )
}

function SkipSheet({ item, onPick, onClose }) {
  const [text, setText] = useState('')
  return (
    <Sheet title={t('skipTitle', item.name)} onClose={onClose}>
      <div className="choices">
        {SKIP_REASONS.map((r) => (
          <button key={r.id} className="choice" onClick={() => onPick(r.id, '')}>{r.label}</button>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onPick(CUSTOM, text.trim()) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('otherReasonPh')} maxLength={80} />
        <button className="btn" disabled={!text.trim()}>{t('save')}</button>
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
    if (!window.confirm(t('deleteItemConfirm', item.name, !!item.msgCount))) return
    api.deleteItem(list.id, item)
    onClose()
  }
  return (
    <Sheet title={t('editTitle')} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label>{t('productLabel')}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></label>
        <div className="row tight">
          <label className="grow">{t('qtyLabel')}<input value={qty} onChange={(e) => setQty(e.target.value)} maxLength={20} placeholder={t('qtyEx')} /></label>
          <label className="grow">{t('aisle')}
            <select value={aisle} onChange={(e) => setAisle(e.target.value)}>
              {aisles.map((a) => <option key={a.id} value={a.id}>{a.icon} {aisleLabel(a)}</option>)}
            </select>
          </label>
        </div>
        <label>{t('note')}<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t('noteEx')} /></label>
        <button type="button" className="btn wide-left" onClick={onChat}>
          <IconChat /> {item.msgCount ? t('chatWithCount', item.msgCount) : t('askAbout')}
        </button>
        <p className="muted small">
          {t('addedBy', item.addedBy?.name)} {fullDate(item.addedAt) && `· ${fullDate(item.addedAt)}`}
          {item.resolvedBy && <><br />{t(item.status === 'bought' ? 'boughtBy' : 'resolvedBy', item.resolvedBy.name)} · {fullDate(item.resolvedAt)}</>}
        </p>
        <div className="row">
          <button type="button" className="btn danger" onClick={remove}>{t('delete')}</button>
          <button className="btn primary grow" disabled={!name.trim()}>{t('save')}</button>
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
      timer = setTimeout(() => stop(t('shopIdleStop')), IDLE_MS)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last > IDLE_MS) stop(t('shopIdleStop'))
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
    if (on && pendingCount === 0) { setOn(false); toast(t('shopDoneStop')) }
  }, [on, pendingCount, toast])

  function start() {
    if (!('wakeLock' in navigator)) { toast(t('shopNoWakeLock')); return }
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
      <button className="shop-start" onClick={start}>🛒 {t('shopMode')} <span className="muted small">{t('shopModeHint')}</span></button>
    ) : null
  }
  return (
    <div className="shop-bar" role="status">
      <span className="grow">{t('shopBar')}</span>
      {list.memberEmails.length > 1 && (
        <button className="btn small" disabled={busy} onClick={announceShop}>{t('shopAnnounce')}</button>
      )}
      <button className="btn small" onClick={() => setOn(false)}>{t('stop')}</button>
    </div>
  )
}
