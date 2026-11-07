import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { THEMES, FONTS, usePrefs, setPref } from './prefs.js'
import { relTime } from './time.js'
import { Sheet, Switch, firstName, useToast, errText, announceErrText, store } from './ui.jsx'
import { myEvents, markAnnounced, eventsSummary, FIRST_CUTOFF } from './data/shared.js'
import { IconUp, IconChevron } from './icons.jsx'
import { AISLES, DEFAULT_AISLE, LEGACY, listAisles, guessAisle, knownAisle, normalize, aisleLabel, canonicalAisleLabel } from './aisles.js'
import { reasonLabel } from './config.js'
import { InviteShare, isInstalled, IconPicker, LangPicker } from './onboarding.jsx'
import { t, locale } from './i18n.jsx'
import { CHANGELOG, VERSION, changes } from './changelog.js'
import { isGiftList, receivesIn, watchGiftItems } from './gifts.js'

const people = (n) => t('people', n)
const products = (n) => t('products', n)

// ---------- Meniul cu liste ----------

export function MenuSheet({ user, admin, lists, current, onPick, onCreate, onMove, onOpen, onClose }) {
  const [newName, setNewName] = useState('')
  const [gift, setGift] = useState(false)
  const giftList = isGiftList(current)
  const [rename, setRename] = useState(current?.name || '')
  const canDelete = current && (current.ownerUid === user.uid || admin)

  async function del() {
    if (!window.confirm(t('deleteListConfirm', current.name))) return
    await api.deleteList(current.id)
    onClose()
  }

  return (
    <Sheet title={t('myLists')} onClose={onClose}>
      <div className="choices">
        {lists.map((l, idx) => (
          <div key={l.id} className="choice-row">
            <button className={`choice grow ${l.id === current?.id ? 'active' : ''}`} onClick={() => onPick(l.id)}>
              <span>{l.name}</span>
              <span className="muted small">{receivesIn(l, user) ? t('giftListOption') : products(l.itemCount)} · {people(l.memberEmails.length)}</span>
            </button>
            {lists.length > 1 && (
              <div className="order-btns">
                <button className="icon-btn sm" disabled={idx === 0} onClick={() => onMove(l.id, -1)} aria-label={t('moveUp', l.name)}><IconUp /></button>
                <button className="icon-btn sm" disabled={idx === lists.length - 1} onClick={() => onMove(l.id, 1)} aria-label={t('moveDown', l.name)}><IconChevron /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) onCreate(newName, gift ? 'gifts' : undefined) }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={gift ? t('newGiftListPh') : t('newListPh')} maxLength={60} />
        <button className="btn" disabled={!newName.trim()}>{t('create')}</button>
      </form>
      <label className="check-line">
        <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
        <span>{t('giftListOption')} <span className="muted small block">{t('giftListOptionHint')}</span></span>
      </label>

      {current && (
        <>
          <h3>{t('currentList')}</h3>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (rename.trim()) { api.renameList(current.id, rename); onClose() } }}>
            <input value={rename} onChange={(e) => setRename(e.target.value)} maxLength={60} aria-label={t('listNameLabel')} />
            <button className="btn" disabled={!rename.trim() || rename.trim() === current.name}>{t('rename')}</button>
          </form>
          {!giftList && <button className="btn wide" onClick={() => onOpen('aisles')}>{t('listAisles')}</button>}
          {!giftList && <button className="btn wide" onClick={() => onOpen('history')}>{t('shoppingHistory')}</button>}
          {canDelete && <button className="btn danger wide" onClick={del}>{t('deleteList')}</button>}
        </>
      )}

      <div className="menu-links">
        <button className="btn wide" onClick={() => onOpen('invite-app')}>{t('inviteFamily')}</button>
        {!isInstalled() && <button className="btn wide" onClick={() => onOpen('install')}>{t('installApp')}</button>}
        <button className="btn wide" onClick={() => onOpen('settings')}>{t('settingsLook')}</button>
        {admin && <button className="btn wide" onClick={() => onOpen('admin')}>{t('admin')}</button>}
      </div>

      <div className="account">
        <div className="avatar" aria-hidden="true">
          {user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" /> : firstName(user.name)[0]}
        </div>
        <div className="grow">
          <div>{user.name}{admin && <span className="badge">admin</span>}</div>
          <div className="muted small">{user.email}</div>
        </div>
        <button className="btn small" onClick={() => api.signOut()}>{t('signOut')}</button>
      </div>
    </Sheet>
  )
}

// ---------- Cine vede lista ----------

export function ShareSheet({ list, user, admin, fresh, onClose }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [invited, setInvited] = useState(null)
  const [receives, setReceives] = useState(false) // lista de cadouri: rolul celui invitat
  const isOwner = list.ownerUid === user.uid
  const canRemove = isOwner || admin
  const gift = isGiftList(list)
  const iReceive = receivesIn(list, user)
  const recipients = list.recipients || []

  function submit(e) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast(t('invalidEmail')); return }
    if (list.memberEmails.includes(v)) { toast(t('alreadyMember')); return }
    api.invite(list, user, v, gift && receives)
    setEmail('')
    setInvited(v)
  }

  function kick(m) {
    if (!window.confirm(t('kickConfirm', m, list.name))) return
    api.removeMember(list, m)
  }

  function leave() {
    if (!window.confirm(t('leaveConfirm', list.name))) return
    api.leaveList(list, user)
    onClose()
  }

  return (
    <Sheet title={fresh ? t('shareNewTitle', list.name) : t('shareTitle', list.name)} onClose={onClose}>
      {fresh && <p className="muted small">{t('shareNewHint')}</p>}
      <ul className="members">
        {list.memberEmails.map((m) => (
          <li key={m}>
            <span className="grow">
              {m}{m === user.email && <span className="muted">{t('youMark')}</span>}
              {m === list.ownerEmail && <span className="badge">{t('listCreator')}</span>}
              {gift && !iReceive && (
                <span className="muted small block">{recipients.includes(m) ? t('roleReceives') : t('roleBuys')}</span>
              )}
            </span>
            {gift && isOwner && m !== list.ownerEmail && (
              <button className="btn small" onClick={() => api.setReceives(list.id, m, !recipients.includes(m))}>
                {recipients.includes(m) ? t('makeBuyer') : t('makeReceiver')}
              </button>
            )}
            {canRemove && m !== list.ownerEmail && m !== user.email && (
              <button className="btn small danger" onClick={() => kick(m)}>{t('remove')}</button>
            )}
          </li>
        ))}
      </ul>
      {!iReceive && (
        <>
          {gift && (
            <div className="segmented" role="radiogroup" aria-label={t('inviteRole')}>
              <button type="button" role="radio" aria-checked={!receives} className={!receives ? 'on' : ''} onClick={() => setReceives(false)}>{t('roleBuys')}</button>
              <button type="button" role="radio" aria-checked={receives} className={receives ? 'on' : ''} onClick={() => setReceives(true)}>{t('roleReceives')}</button>
            </div>
          )}
          <form className="row" onSubmit={submit}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPh')}
              autoComplete="off" autoCapitalize="off" aria-label={t('inviteEmailLabel')} />
            <button className="btn primary" disabled={!email.trim()}>{t('invite')}</button>
          </form>
          <p className="muted small">
            {gift ? t('giftShareHint') : t('shareHint')}
            {!canRemove && t('onlyOwnerRemoves')}
          </p>
        </>
      )}
      {invited && <InviteShare user={user} email={invited} listName={list.name} />}
      {!isOwner && list.memberEmails.includes(user.email) && (
        <button className="btn danger wide" onClick={leave}>{t('leaveList')}</button>
      )}
    </Sheet>
  )
}

// ---------- Setări ----------

export function SettingsSheet({ user, onClose }) {
  const prefs = usePrefs()
  const [news, setNews] = useState(false)
  // Încarcă toate fonturile ca să poată fi văzute înainte de alegere.
  useEffect(() => {
    for (const f of FONTS) {
      if (!f.google || document.getElementById(`font-${f.id}`)) continue
      const link = document.createElement('link')
      link.id = `font-${f.id}`
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
      document.head.appendChild(link)
    }
  }, [])

  return (
    <Sheet title={t('settingsLook')} onClose={onClose}>
      <h3>{t('language')}</h3>
      <LangPicker />
      <p className="muted small">{t('languageHint')}</p>

      <h3>{t('appIcon')}</h3>
      <IconPicker />

      <PushSettings user={user} />

      <h3>{t('theme')}</h3>
      <div className="segmented" role="radiogroup" aria-label={t('theme')}>
        {THEMES.map((th) => (
          <button key={th.id} role="radio" aria-checked={prefs.theme === th.id}
            className={prefs.theme === th.id ? 'on' : ''} onClick={() => setPref('theme', th.id)}>{t(`theme.${th.id}`)}</button>
        ))}
      </div>
      <p className="muted small">{t('themeAutoHint')}</p>

      <h3>{t('font')}</h3>
      <div className="choices" role="radiogroup" aria-label={t('font')}>
        {FONTS.map((f) => (
          <button key={f.id} role="radio" aria-checked={prefs.font === f.id}
            className={`choice ${prefs.font === f.id ? 'active' : ''}`} style={{ fontFamily: f.css }}
            onClick={() => setPref('font', f.id)}>
            <span>{t(`font.${f.id}`)}</span>
            <span className="muted">{t('fontSample')}</span>
          </button>
        ))}
      </div>

      <h3>{t('listSection')}</h3>
      <Switch checked={prefs.groupByAisle} onChange={(v) => setPref('groupByAisle', v)}>
        {t('groupByAisle')}
        <span className="muted small block">{t('groupByAisleHint')}</span>
      </Switch>
      <Switch checked={prefs.suggestions} onChange={(v) => setPref('suggestions', v)}>
        {t('suggestions')}
        <span className="muted small block">{t('suggestionsHint')}</span>
      </Switch>
      <p className="muted small">{t('settingsSynced')}</p>

      <h3>{t('privacy')}</h3>
      <p className="muted small">{t('privacyText')}</p>

      {/* Versiunea (atinsă, arată noutățile) și mulțumirile, discret, la final. */}
      <footer className="credits">
        <button type="button" className="ver" onClick={() => setNews(true)}>
          DuoShopping {VERSION} · <u>{t('whatsNew')}</u>
        </button>
        <span>{t('madeBy')}</span>
        <span className="small">{t('supportedBy')}</span>
      </footer>
      {news && <NewsSheet onClose={() => setNews(false)} />}
    </Sheet>
  )
}

function NewsSheet({ onClose }) {
  const date = (d) => new Date(`${d}T12:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Sheet title={t('whatsNewTitle')} onClose={onClose}>
      {CHANGELOG.map((e) => (
        <section key={e.v} className="news">
          <h3>{t('versionN', e.v)} <span className="muted">· {date(e.date)}</span></h3>
          <ul>{changes(e).map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      ))}
    </Sheet>
  )
}

// ---------- Administrare ----------

export function AdminSheet({ user, onClose }) {
  const toast = useToast()
  const [lists, setLists] = useState(null)
  const [allowed, setAllowed] = useState(null)
  useEffect(() => api.watchAllLists(setLists, (e) => toast(errText(e))), [toast])
  useEffect(() => api.watchAllowed(setAllowed, (e) => toast(errText(e))), [toast])

  async function del(l) {
    if (!window.confirm(t('adminDeleteConfirm', l.name, products(l.itemCount)))) return
    try {
      if (l.memberEmails.includes(user.email)) await api.deleteList(l.id)
      else await api.adminDeleteList(l.id)
      toast(t('listDeleted', l.name))
    } catch (e) { toast(errText(e)) }
  }

  function revoke(a) {
    if (!window.confirm(t('revokeConfirm', a.email))) return
    api.revokeAccess(a.email)
  }

  return (
    <Sheet title={t('admin')} onClose={onClose}>
      <h3>{t('allLists', lists?.length ?? '…')}</h3>
      <p className="muted small">{t('adminListsHint')}</p>
      <ul className="members">
        {lists?.map((l) => (
          <li key={l.id}>
            <span className="grow">
              <b>{l.name}</b> <span className="muted small">· {products(l.itemCount)}</span>
              <span className="muted small block">{l.memberEmails.join(', ')}</span>
            </span>
            <button className="btn small danger" onClick={() => del(l)}>{t('delete')}</button>
          </li>
        ))}
      </ul>

      <h3>{t('peopleWithAccess', allowed?.length ?? '…')}</h3>
      <p className="muted small">{t('accessHint')}</p>
      <ul className="members">
        {allowed?.map((a) => (
          <li key={a.email}>
            <span className="grow">
              {a.email}
              <span className="muted small block">{t('invitedBy', a.invitedByEmail === user.email ? t('invitedByYou') : a.invitedByEmail)}{a.at ? ` · ${relTime(a.at)}` : ''}</span>
            </span>
            {a.email !== user.email && <button className="btn small danger" onClick={() => revoke(a)}>{t('remove')}</button>}
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

// ---------- Notificări: pornire pe telefonul ăsta ----------

function PushSettings({ user }) {
  const toast = useToast()
  const [status, setStatus] = useState(() => api.pushStatus())
  const [busy, setBusy] = useState(false)

  async function toggle(on) {
    setBusy(true)
    try {
      if (on) { await api.enablePush(user); toast(t('pushOn')) }
      else await api.disablePush()
    } catch (e) { toast(errText(e)) }
    setStatus(api.pushStatus())
    setBusy(false)
  }

  return (
    <>
      <h3>{t('notifications')}</h3>
      {status === 'on' || status === 'off' ? (
        <Switch checked={status === 'on'} onChange={(v) => !busy && toggle(v)}>
          {t('pushSwitch')}
          <span className="muted small block">{t('pushSwitchHint')}</span>
        </Switch>
      ) : (
        <p className="muted small">
          {status === 'needs-install' && t('pushNeedsInstall')}
          {status === 'denied' && t('pushDenied')}
          {status === 'unsupported' && (api.isDemo ? t('pushNoDemo') : t('pushNoBrowser'))}
        </p>
      )}
    </>
  )
}

// ---------- „Gata, anunță” ----------

// Ce ai făcut pe lista curentă și n-ai anunțat încă. Folosit de clopoțel (numărul) și de fereastra de anunț.
export function useAnnounce(list, user) {
  const [items, setItems] = useState(null)
  const [states, setStates] = useState(null)
  useEffect(() => {
    setItems(null)
    if (!list) return undefined
    return isGiftList(list) ? watchGiftItems(list.id, setItems) : api.watchItems(list.id, setItems)
  }, [list?.id])
  useEffect(() => api.watchAnnounced(user.uid, setStates), [user.uid])
  if (!list || !items || !states) return { pending: null, mark: () => {} }
  // Înainte, momentul ultimului anunț stătea doar pe telefon; îl folosim cât lista n-are încă stare în cont.
  const state = states[list.id] ?? { cutoff: Math.max(store.get(`anunt-${list.id}-${user.uid}`, 0), FIRST_CUTOFF()) }
  const pending = myEvents(items, user, state)
  const mark = (keys) => api.saveAnnounced(user.uid, list.id, markAnnounced(state, pending, keys))
  return { pending, mark }
}

const EVENT_LABEL = { added: 'evAdded', bought: 'evBought', skipped: 'evSkipped' }

export function AnnounceSheet({ list, user, pending, mark, onClose }) {
  const toast = useToast()
  const [off, setOff] = useState(() => new Set()) // evenimentele debifate
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const others = list.memberEmails.filter((m) => m !== user.email)
  const picked = pending ? pending.filter((e) => !off.has(e.key)) : []
  const keys = picked.map((e) => e.key)
  const summary = pending ? eventsSummary(picked, user) : null
  const text = summary ? [summary.text, note.trim()].filter(Boolean).join('\n') : ''

  const toggle = (key) => setOff((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const all = pending && off.size === 0

  async function send(message, withEvents) {
    setBusy(true)
    setErr('')
    const res = await sendAnnounce(list.id, message, toast)
    setBusy(false)
    if (res.ok) {
      if (withEvents && keys.length) mark(keys)
      onClose()
    } else setErr(res.error) // fereastra rămâne deschisă, ca să poți încerca din nou
  }

  function markOnly() {
    mark(keys)
    toast(t('markedAnnounced', keys.length))
    setOff(new Set())
    if (keys.length === pending.length) onClose()
  }

  return (
    <Sheet title={t('announceTitle')} onClose={onClose}>
      {!others.length ? (
        <p className="muted">{t('announceAlone', list.name)}</p>
      ) : (
        <>
          <p className="muted small">{t('announceHint', list.name)}</p>
          {pending && pending.length > 0 && (
            <>
              <div className="ann-head">
                <h3>{t('announcePick')}</h3>
                <button type="button" className="link-btn" onClick={() => setOff(all ? new Set(pending.map((e) => e.key)) : new Set())}>
                  {all ? t('pickNone') : t('pickAll')}
                </button>
              </div>
              <ul className="ann-events">
                {pending.map((e) => (
                  <li key={e.key}>
                    <label>
                      <input type="checkbox" checked={!off.has(e.key)} onChange={() => toggle(e.key)} />
                      <span className={`ann-type ${e.type}`}>{t(EVENT_LABEL[e.type])}</span>
                      <span className="grow">{e.item.name}{e.item.quantity && <span className="muted"> · {e.item.quantity}</span>}</span>
                      <span className="muted small">{relTime(e.at)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
          {pending && !pending.length && <p className="muted">{t('nothingNew')}</p>}
          <div className="announce-preview">
            <b>{list.name}</b>
            <span>{summary ? summary.text : t('loading')}</span>
            {note.trim() && <span>{note.trim()}</span>}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={150}
            placeholder={t('announceNotePh')} aria-label={t('announceNoteLabel')} />
          {err && <p className="error">{err}</p>}
          <button className="btn primary wide" disabled={busy || !summary} onClick={() => send(text, true)}>
            {busy ? t('sending') : keys.length ? t('sendAnnounceN', keys.length) : t('sendAnnounce')}
          </button>
          {pending && pending.length > 0 && (
            <button className="btn wide" disabled={busy || !keys.length} onClick={markOnly}>
              {t('markAnnounced', keys.length)}
            </button>
          )}
          <button className="btn wide" disabled={busy} onClick={() => send(atShopText(user), false)}>
            {t('announceAtShop')}
          </button>
        </>
      )}
    </Sheet>
  )
}

export const atShopText = (user) => t('atShopText', firstName(user.name))

// Trimite un anunț și arată rezultatul. Întoarce { ok } sau { ok: false, error } (mesaj clar că n-a plecat).
export async function sendAnnounce(listId, text, toast) {
  try {
    const r = await api.announce(listId, text)
    if (r.demo) toast(t('announceDemo'))
    else if (r.phones > 0) toast(r.withoutPhone.length ? t('announceSentMissing', r.withoutPhone.join(', ')) : t('announceSent'))
    else toast(t('announceNobody'))
    return { ok: true }
  } catch (e) {
    console.error(e)
    return { ok: false, error: announceErrText(e) }
  }
}
// ---------- Raioanele listei ----------

const newAisleId = () => `r-${Math.random().toString(36).slice(2, 8)}`

export function AislesSheet({ list, onClose }) {
  const toast = useToast()
  // Raioanele implicite apar cu numele traduse; la salvare revin la numele de bază (vezi canonicalAisleLabel).
  const [rows, setRows] = useState(() => listAisles(list).map((a) => ({ ...a, label: aisleLabel(a), keywords: (a.keywords || []).join(', ') })))
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('🛒')

  const edit = (i, patch) => setRows((r) => r.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  function remove(i) {
    if (!window.confirm(t('aisleDeleteConfirm', rows[i].label))) return
    setRows((r) => r.filter((_, j) => j !== i))
  }
  function add(e) {
    e.preventDefault()
    if (!newLabel.trim()) return
    // Raioanele noi apar înainte de „Altele”.
    const at = rows.findIndex((a) => a.id === DEFAULT_AISLE)
    const row = { id: newAisleId(), label: newLabel.trim(), icon: newIcon.trim() || '🛒', keywords: '' }
    setRows((r) => (at === -1 ? [...r, row] : [...r.slice(0, at), row, ...r.slice(at)]))
    setNewLabel('')
  }
  function save() {
    if (rows.some((a) => !a.label.trim())) { toast(t('aisleNeedsName')); return }
    const aisles = rows.map((a) => {
      const keywords = a.keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 30)
      const label = canonicalAisleLabel(a.id, a.label.trim().slice(0, 40))
      return { id: a.id, label, icon: (a.icon.trim() || '🛒').slice(0, 8), ...(keywords.length ? { keywords } : {}) }
    })
    api.setListAisles(list.id, aisles)
    toast(t('aislesSaved'))
    onClose()
  }
  function reset() {
    if (!window.confirm(t('aislesResetConfirm'))) return
    setRows(AISLES.map((a) => ({ ...a, label: aisleLabel(a), keywords: '' })))
  }
  // Treci pe setul nou: raioanele implicite noi, apoi cele adăugate de voi (cu cuvintele lor), apoi „Altele”.
  // Produsele din raioanele vechi își găsesc singure locul în cele noi.
  const oldSet = rows.some((a) => LEGACY[a.id])
  function upgrade() {
    if (!window.confirm(t('aislesUpgradeConfirm'))) return
    const isDefault = (id) => AISLES.some((a) => a.id === id) || LEGACY[id]
    const own = rows.filter((a) => !isDefault(a.id))
    const base = AISLES.filter((a) => a.id !== DEFAULT_AISLE).map((a) => {
      const kept = rows.find((r) => r.id === a.id)
      return { ...a, label: aisleLabel(a), keywords: kept?.keywords || '' }
    })
    const other = AISLES.find((a) => a.id === DEFAULT_AISLE)
    setRows([...base, ...own, { ...other, label: aisleLabel(other), keywords: rows.find((r) => r.id === DEFAULT_AISLE)?.keywords || '' }])
  }

  return (
    <Sheet title={t('aislesTitle', list.name)} onClose={onClose}>
      <p className="muted small">{t('aislesHint')}</p>
      {oldSet && (
        <div className="hint-bar">
          <span className="grow small">{t('aislesOldSet')}</span>
          <button type="button" className="btn small primary" onClick={upgrade}>{t('aislesUpgrade')}</button>
        </div>
      )}
      <ul className="aisle-edit">
        {rows.map((a, i) => (
          <li key={a.id}>
            <div className="row tight">
              <input className="emoji-in" value={a.icon} onChange={(e) => edit(i, { icon: e.target.value })} aria-label={t('emoji')} maxLength={8} />
              <input className="grow" value={a.label} onChange={(e) => edit(i, { label: e.target.value })} aria-label={t('aisleName')} maxLength={40} />
              <div className="order-btns">
                <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('moveUp', a.label)}><IconUp /></button>
                <button type="button" className="icon-btn sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t('moveDown', a.label)}><IconChevron /></button>
              </div>
            </div>
            <div className="row tight">
              <input className="grow small-in" value={a.keywords} onChange={(e) => edit(i, { keywords: e.target.value })}
                placeholder={t('keywordsPh')} aria-label={t('keywordsFor', a.label)} />
              {a.id !== DEFAULT_AISLE && <button type="button" className="btn small danger" onClick={() => remove(i)}>{t('delete')}</button>}
            </div>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <input className="emoji-in" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} aria-label={t('newAisleEmoji')} maxLength={8} />
        <input className="grow" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={t('newAislePh')} maxLength={40} />
        <button className="btn" disabled={!newLabel.trim()}>{t('add')}</button>
      </form>
      <p className="muted small">{t('keywordsHint')}</p>
      <div className="row">
        <button type="button" className="btn" onClick={reset}>{t('defaults')}</button>
        <button type="button" className="btn primary grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  )
}
// ---------- Istoric cumpărături ----------

const dayLabel = (ms) => {
  const d = new Date(ms), today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t('today')
  if (d.toDateString() === y.toDateString()) return t('yesterday')
  return d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
}

export function HistorySheet({ list, user, onClose }) {
  const toast = useToast()
  const [history, setHistory] = useState(null)
  const [pending, setPending] = useState([])
  useEffect(() => api.watchHistory(list.id, setHistory, (e) => toast(errText(e))), [list.id, toast])
  useEffect(() => api.watchItems(list.id, (items) => setPending(items.filter((i) => i.status === 'pending')), () => {}), [list.id])

  const aisles = listAisles(list)
  const onList = new Set(pending.map((i) => normalize(i.name)))

  function readd(item) {
    const aisle = item.aisle ? knownAisle(aisles, item.aisle, item.name) : guessAisle(item.name, aisles)
    api.addItem(list.id, user, { name: item.name, quantity: item.quantity || '', note: item.note || '', aisle })
    toast(t('toastBack', item.name))
  }

  const days = []
  for (const it of history || []) {
    const label = it.resolvedAt ? dayLabel(it.resolvedAt) : t('noDate')
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1).items.push(it)
  }

  return (
    <Sheet title={t('historyTitle', list.name)} onClose={onClose}>
      {history === null && <p className="center muted">{t('loading')}</p>}
      {history?.length === 0 && <p className="muted">{t('historyEmpty')}</p>}
      {days.map((d) => (
        <section key={d.label}>
          <h3>{d.label}</h3>
          <ul className="members">
            {d.items.map((it) => (
              <li key={it.id}>
                <span className="grow">
                  {it.name}{it.quantity && <span className="muted"> · {it.quantity}</span>}
                  <span className="muted small block">
                    {it.status === 'bought' ? t('boughtByShort', firstName(it.resolvedBy?.name)) : `${reasonLabel(it)} · ${firstName(it.resolvedBy?.name)}`}
                  </span>
                </span>
                {onList.has(normalize(it.name))
                  ? <span className="muted small">{t('onList')}</span>
                  : <button className="btn small" onClick={() => readd(it)}>{t('add')}</button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {history?.length === 200 && <p className="muted small">{t('historyLimit')}</p>}

    </Sheet>
  )
}
