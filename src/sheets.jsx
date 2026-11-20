import { useEffect, useMemo, useState } from 'react'
import * as api from './data/index.js'
import { THEMES, FONTS, usePrefs, setPref } from './prefs.js'
import { relTime } from './time.js'
import { Sheet, Switch, firstName, useToast, errText, announceErrText, store } from './ui.jsx'
import { myEvents, markAnnounced, eventsSummary, eventsTarget, FIRST_CUTOFF, validEmail } from './data/shared.js'
import { personName, cleanAlias } from './people.js'
import { IconUp, IconChevron } from './icons.jsx'
import { AISLES, DEFAULT_AISLE, LEGACY, listAisles, guessAisle, knownAisle, normalize, aisleLabel, canonicalAisleLabel } from './aisles.js'
import { reasonLabel } from './config.js'
import { InviteShare, isInstalled, IconPicker, LangPicker } from './onboarding.jsx'
import { t, locale } from './i18n.jsx'
import { CHANGELOG, VERSION, changes } from './changelog.js'
import { isGiftList, receivesIn, watchGiftItems, recipientName, isNamedRecipient } from './gifts.js'
import { listShops, listSets, shopIn, newShopId, newSetId, setText, MAX_SHOPS, MAX_SETS, MAX_SET_ITEMS } from './shops.js'
import { parseProducts } from './voice.js'

const people = (n) => t('people', n)
const products = (n) => t('products', n)

// ---------- Meniul cu liste ----------

export function MenuSheet({ user, admin, lists, current, onPick, onCreate, onMove, onOpen, onClose }) {
  const [newName, setNewName] = useState('')
  const [gift, setGift] = useState(false)
  const giftList = isGiftList(current)
  const [rename, setRename] = useState(current?.name || '')
  // Doar cine a creat lista o șterge de aici. Adminul șterge listele altora din panoul de admin.
  const canDelete = current && current.ownerUid === user.uid
  const toast = useToast()

  async function del() {
    if (!window.confirm(t('deleteListConfirm', current.name))) return
    try {
      await api.deleteList(current.id)
      onClose()
    } catch (e) {
      console.error(e)
      toast(`${t('deleteListFailed')} ${errText(e) || ''}`.trim())
    }
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
          {!giftList && <button className="btn wide" onClick={() => onOpen('shops')}>{t('listShops')}</button>}
          {!giftList && <button className="btn wide" onClick={() => onOpen('sets')}>{t('listSets')}</button>}
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

export function ShareSheet({ list, lists = [], user, admin, fresh, onClose }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [invited, setInvited] = useState(null)
  const [receives, setReceives] = useState(false) // lista de cadouri: rolul celui invitat
  const isOwner = list.ownerUid === user.uid
  const canRemove = isOwner || admin
  const gift = isGiftList(list)
  const iReceive = receivesIn(list, user)
  const recipients = list.recipients || []

  // Adresele cunoscute: oamenii din celelalte liste ale tale. Cele mai des întâlnite vin primele.
  // Alese dintr-o atingere, nu mai pot fi tastate greșit.
  const known = useMemo(() => {
    const seen = new Map()
    for (const l of lists) for (const m of l.memberEmails || []) seen.set(m, (seen.get(m) || 0) + 1)
    const q = email.trim().toLowerCase()
    return [...seen.keys()]
      .filter((m) => m !== user.email && !list.memberEmails.includes(m) && m !== q && m.includes(q))
      .sort((a, b) => seen.get(b) - seen.get(a) || a.localeCompare(b))
      .slice(0, 6)
  }, [lists, list.memberEmails, user.email, email])

  function submit(e) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!validEmail(v)) { toast(t('invalidEmail')); return }
    if (list.memberEmails.includes(v)) { toast(t('alreadyMember')); return }
    api.invite(list, user, v, gift && receives)
    setEmail('')
    setInvited(v)
  }

  // Poreclă pentru @ în mesaje (rămâne în setările tale, pe toate listele).
  const aliases = usePrefs().aliases || {}
  function setAlias(m) {
    const v = window.prompt(t('aliasPrompt', m), aliases[m] || '')
    if (v === null) return
    const next = { ...aliases }
    const a = cleanAlias(v)
    if (a) next[m] = a; else delete next[m]
    setPref('aliases', next)
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
              {aliases[m] && <span className="badge">@{aliases[m]}</span>}
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
            {m !== user.email && (
              <button className="btn small" onClick={() => setAlias(m)}>{t('aliasBtn')}</button>
            )}
            {canRemove && m !== list.ownerEmail && m !== user.email && (
              <button className="btn small danger" onClick={() => kick(m)}>{t('remove')}</button>
            )}
          </li>
        ))}
      </ul>
      {gift && !iReceive && <RecipientsBox list={list} isOwner={isOwner} />}
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
          {known.length > 0 && (
            <div className="suggestions known" aria-label={t('knownEmails')}>
              {known.map((m) => (
                <button key={m} type="button" className="chip" onClick={() => setEmail(m)}>{m}</button>
              ))}
            </div>
          )}
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

// Lista de cadouri: cine primește cadouri, cu numele afișat în listă. Creatorul listei le schimbă numele
// și poate adăuga pe cineva doar cu numele (fără cont și fără aplicație, ex. „Bunica”); ideile pentru
// el le adaugă cei care cumpără.
function RecipientsBox({ list, isOwner }) {
  const [name, setName] = useState('')
  const [items, setItems] = useState([]) // pentru numele din cont, cât creatorul nu le-a schimbat
  useEffect(() => api.watchItems(list.id, setItems), [list.id])
  const recipients = list.recipients || []
  const nameOf = (id) => recipientName(list, id, items)

  function rename(id) {
    const v = window.prompt(t('renameRecipient'), nameOf(id))
    if (v !== null && v.trim()) api.setRecipientName(list.id, id, v.slice(0, 40))
  }
  function remove(id) {
    if (!window.confirm(t('removeNamedConfirm', nameOf(id)))) return
    api.removeNamedRecipient(list.id, id)
  }
  function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    api.addNamedRecipient(list.id, name.slice(0, 40))
    setName('')
  }

  return (
    <>
      <h3>{t('recipientsTitle')}</h3>
      {recipients.length === 0 && <p className="muted small">{t('noRecipientsYet')}</p>}
      <ul className="members">
        {recipients.map((id) => (
          <li key={id}>
            <span className="grow">
              🎁 {nameOf(id)}
              <span className="muted small block">{isNamedRecipient(id) ? t('noAccount') : id}</span>
            </span>
            {isOwner && <button className="btn small" onClick={() => rename(id)}>{t('rename')}</button>}
            {isOwner && isNamedRecipient(id) && <button className="btn small danger" onClick={() => remove(id)}>{t('remove')}</button>}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form className="row" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t('namedRecipientPh')}
            aria-label={t('namedRecipientPh')} />
          <button className="btn" disabled={!name.trim()}>{t('add')}</button>
        </form>
      )}
      <p className="muted small">{isOwner ? t('namedRecipientHint') : t('onlyOwnerNames')}</p>
    </>
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
      await api.deleteList(l.id)
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

const EVENT_LABEL = { added: 'evAdded', bought: 'evBought', skipped: 'evSkipped', message: 'evMessage', secretMsg: 'evSecretMessage' }

export function AnnounceSheet({ list, user, pending, mark, onClose }) {
  const toast = useToast()
  const [off, setOff] = useState(() => new Set()) // evenimentele debifate
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const others = list.memberEmails.filter((m) => m !== user.email)
  // Pe o listă de cadouri, cei care primesc cadouri nu primesc anunțuri; nici nu apar la alegere.
  const aliases = usePrefs().aliases
  const candidates = others.filter((m) => !(isGiftList(list) && (list.recipients || []).includes(m)))
  const [skipTo, setSkipTo] = useState(() => new Set()) // persoanele debifate
  const chosen = candidates.filter((m) => !skipTo.has(m))
  const toggleTo = (m) => setSkipTo((s) => { const n = new Set(s); n.has(m) ? n.delete(m) : n.add(m); return n })
  // Doar dacă n-ai ales pe toți trimitem lista; altfel funcția din cloud anunță pe toți, ca până acum.
  const toOpts = chosen.length < candidates.length
    ? { to: chosen, toNames: chosen.map((m) => personName(m, aliases)) } : {}
  const picked = pending ? pending.filter((e) => !off.has(e.key)) : []
  const keys = picked.map((e) => e.key)
  const summary = pending ? eventsSummary(picked, user) : null
  const text = summary ? [summary.text, note.trim()].filter(Boolean).join('\n') : ''

  const toggle = (key) => setOff((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const all = pending && off.size === 0

  async function send(message, withEvents, extra = {}) {
    setBusy(true)
    setErr('')
    const res = await sendAnnounce(list.id, message, toast, { ...toOpts, ...extra })
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
          {candidates.length > 1 && (
            <>
              <div className="ann-head">
                <h3>{t('announceTo')} <span className="muted small">{t('announceToN', chosen.length, candidates.length)}</span></h3>
              </div>
              <div className="gift-for" role="group" aria-label={t('announceTo')}>
                {candidates.map((m) => (
                  <button key={m} type="button" aria-pressed={!skipTo.has(m)} className={`chip ${skipTo.has(m) ? '' : 'on'}`}
                    onClick={() => toggleTo(m)}>{personName(m, aliases)}</button>
                ))}
              </div>
            </>
          )}
          <div className="announce-preview">
            <b>{list.name}</b>
            <span>{summary ? summary.text : t('loading')}</span>
            {note.trim() && <span>{note.trim()}</span>}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={150}
            placeholder={t('announceNotePh')} aria-label={t('announceNoteLabel')} />
          {err && <p className="error">{err}</p>}
          <button className="btn primary wide" disabled={busy || !summary || !chosen.length} onClick={() => send(text, true, eventsTarget(picked))}>
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

export const atShopText = (user, shop) => (shop ? t('atShopNamed', firstName(user.name), shop.name) : t('atShopText', firstName(user.name)))

// Trimite un anunț și arată rezultatul. Întoarce { ok } sau { ok: false, error } (mesaj clar că n-a plecat).
export async function sendAnnounce(listId, text, toast, opts) {
  try {
    const r = await api.announce(listId, text, opts)
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
// ---------- Magazinele listei ----------
// Un produs poate avea un magazin (ales din fereastra produsului și ținut minte pentru data viitoare).
// Deasupra listei alegi magazinul în care ești și vezi doar ce se ia de acolo, plus ce se ia de oriunde.

export function ShopsSheet({ list, onClose }) {
  const toast = useToast()
  const [rows, setRows] = useState(() => listShops(list).map((s) => ({ ...s })))
  const [name, setName] = useState('')

  const edit = (i, v) => setRows((r) => r.map((s, j) => (j === i ? { ...s, name: v } : s)))
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  function remove(i) {
    if (!window.confirm(t('shopDeleteConfirm', rows[i].name))) return
    setRows((r) => r.filter((_, j) => j !== i))
  }
  function add(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (rows.some((s) => normalize(s.name) === normalize(n))) { toast(t('shopExists', n)); return }
    setRows((r) => [...r, { id: newShopId(), name: n }])
    setName('')
  }
  function save() {
    // Un nume scris și neadăugat încă se salvează și el.
    const extra = name.trim() && !rows.some((s) => normalize(s.name) === normalize(name)) ? [{ id: newShopId(), name: name.trim() }] : []
    const all = [...rows, ...extra]
    if (all.some((s) => !s.name.trim())) { toast(t('shopNeedsName')); return }
    api.setListShops(list.id, all.slice(0, MAX_SHOPS).map((s) => ({ id: s.id, name: s.name.trim().slice(0, 30) })))
    toast(t('shopsSaved'))
    onClose()
  }

  return (
    <Sheet title={t('shopsTitle', list.name)} onClose={onClose}>
      <p className="muted small">{t('shopsHint')}</p>
      <ul className="aisle-edit">
        {rows.map((s, i) => (
          <li key={s.id}>
            <div className="row tight">
              <input className="grow" value={s.name} onChange={(e) => edit(i, e.target.value)} aria-label={t('shopName')} maxLength={30} />
              <div className="order-btns">
                <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('moveUp', s.name)}><IconUp /></button>
                <button type="button" className="icon-btn sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t('moveDown', s.name)}><IconChevron /></button>
              </div>
              <button type="button" className="btn small danger" onClick={() => remove(i)}>{t('delete')}</button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length < MAX_SHOPS && (
        <form className="row" onSubmit={add}>
          <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('shopNewPh')} maxLength={30} />
          <button className="btn" disabled={!name.trim()}>{t('add')}</button>
        </form>
      )}
      <button type="button" className="btn primary wide" onClick={save}>{t('save')}</button>
    </Sheet>
  )
}

// ---------- Seturi de produse ----------
// Un set e o listă scurtă de produse cu nume („Grătar”, „Mic dejun”), pusă pe listă dintr-o atingere.
// Apare și ca sugestie când îi scrii numele în câmpul de adăugare.

export function SetsSheet({ list, user, onClose }) {
  const toast = useToast()
  const sets = listSets(list)
  const [draft, setDraft] = useState(null) // { id (null = set nou), name, text }
  const [pending, setPending] = useState([])
  const [products, setProducts] = useState([])
  useEffect(() => api.watchItems(list.id, (items) => setPending(items.filter((i) => i.status === 'pending')), () => {}), [list.id])
  useEffect(() => api.watchProducts(list.id, setProducts), [list.id])

  const aisles = listAisles(list)
  const shops = listShops(list)
  const key = (p) => `${normalize(p.name)}|${normalize(p.quantity || '')}`

  function addToList(set) {
    const onList = new Set(pending.map(key))
    const fresh = set.items.filter((p) => !onList.has(key(p)))
    for (const p of fresh) {
      const known = products.find((k) => normalize(k.name) === normalize(p.name))
      const aisle = known?.aisle ? knownAisle(aisles, known.aisle, p.name) : guessAisle(p.name, aisles)
      api.addItem(list.id, user, { name: p.name, quantity: p.quantity || '', aisle, shop: shopIn(shops, known?.shop)?.id || null })
    }
    toast(fresh.length ? t('addedMany', fresh.map((p) => p.name).join(', ')) : t('setAllOnList', set.name))
    if (fresh.length) onClose()
  }
  function remove(set) {
    if (!window.confirm(t('setDeleteConfirm', set.name))) return
    api.setListSets(list.id, sets.filter((s) => s.id !== set.id))
  }
  function save(e) {
    e.preventDefault()
    const items = parseProducts(draft.text).slice(0, MAX_SET_ITEMS)
    if (!draft.name.trim() || !items.length) { toast(t('setNeedsBoth')); return }
    const set = { id: draft.id || newSetId(), name: draft.name.trim().slice(0, 40), items }
    api.setListSets(list.id, draft.id ? sets.map((s) => (s.id === draft.id ? set : s)) : [...sets, set])
    setDraft(null)
  }

  if (draft) {
    return (
      <Sheet title={draft.id ? t('setEditTitle') : t('setNewTitle')} onClose={() => setDraft(null)}>
        <form className="stack" onSubmit={save}>
          <label>{t('setName')}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={40} placeholder={t('setNamePh')} /></label>
          <label>{t('setItems')}
            <textarea rows={7} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder={t('setItemsPh')} />
          </label>
          {pending.length > 0 && (
            <button type="button" className="btn wide-left" onClick={() => setDraft({ ...draft, text: setText(pending) })}>
              {t('setFromList', pending.length)}
            </button>
          )}
          <div className="row">
            <button type="button" className="btn" onClick={() => setDraft(null)}>{t('previewCancel')}</button>
            <button className="btn primary grow" disabled={!draft.name.trim() || !draft.text.trim()}>{t('save')}</button>
          </div>
        </form>
      </Sheet>
    )
  }

  return (
    <Sheet title={t('setsTitle', list.name)} onClose={onClose}>
      <p className="muted small">{t('setsHint')}</p>
      <ul className="members">
        {sets.map((s) => (
          <li key={s.id} className="set-row">
            <span className="grow">
              🧺 <b>{s.name}</b>
              <span className="muted small block">{s.items.map((p) => `${p.quantity ? `${p.quantity} ` : ''}${p.name}`).join(', ')}</span>
            </span>
            <span className="set-btns">
              <button className="btn small primary" onClick={() => addToList(s)}>{t('setAdd')}</button>
              <button className="btn small" onClick={() => setDraft({ id: s.id, name: s.name, text: setText(s.items) })}>{t('setEdit')}</button>
              <button className="btn small danger" onClick={() => remove(s)}>{t('delete')}</button>
            </span>
          </li>
        ))}
      </ul>
      {sets.length < MAX_SETS && (
        <button className="btn wide" onClick={() => setDraft({ id: null, name: '', text: '' })}>{t('setNew')}</button>
      )}
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
