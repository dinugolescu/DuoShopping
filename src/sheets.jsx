import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { THEMES, FONTS, usePrefs, setPref } from './prefs.js'
import { relTime } from './time.js'
import { Sheet, Switch, firstName, useToast, errText, announceErrText, store } from './ui.jsx'
import { sessionSummary } from './data/shared.js'
import { IconUp, IconChevron } from './icons.jsx'
import { AISLES, DEFAULT_AISLE, listAisles, guessAisle, normalize } from './aisles.js'
import { reasonLabel } from './config.js'
import { InviteShare, isInstalled, IconPicker } from './onboarding.jsx'

const people = (n) => (n > 1 ? `${n} persoane` : 'doar tu')
const products = (n = 0) => (n === 1 ? '1 produs' : `${n} produse`)

// ---------- Meniul cu liste ----------

export function MenuSheet({ user, admin, lists, current, onPick, onCreate, onMove, onOpen, onClose }) {
  const [newName, setNewName] = useState('')
  const [rename, setRename] = useState(current?.name || '')
  const canDelete = current && (current.ownerUid === user.uid || admin)

  async function del() {
    if (!window.confirm(`Ștergi lista „${current.name}” cu tot ce conține, pentru toți membrii? Nu se poate anula.`)) return
    await api.deleteList(current.id)
    onClose()
  }

  return (
    <Sheet title="Listele mele" onClose={onClose}>
      <div className="choices">
        {lists.map((l, idx) => (
          <div key={l.id} className="choice-row">
            <button className={`choice grow ${l.id === current?.id ? 'active' : ''}`} onClick={() => onPick(l.id)}>
              <span>{l.name}</span>
              <span className="muted small">{products(l.itemCount)} · {people(l.memberEmails.length)}</span>
            </button>
            {lists.length > 1 && (
              <div className="order-btns">
                <button className="icon-btn sm" disabled={idx === 0} onClick={() => onMove(l.id, -1)} aria-label={`Mută „${l.name}” mai sus`}><IconUp /></button>
                <button className="icon-btn sm" disabled={idx === lists.length - 1} onClick={() => onMove(l.id, 1)} aria-label={`Mută „${l.name}” mai jos`}><IconChevron /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) onCreate(newName) }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Listă nouă, ex. Farmacie" maxLength={60} />
        <button className="btn" disabled={!newName.trim()}>Creează</button>
      </form>

      {current && (
        <>
          <h3>Lista curentă</h3>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (rename.trim()) { api.renameList(current.id, rename); onClose() } }}>
            <input value={rename} onChange={(e) => setRename(e.target.value)} maxLength={60} aria-label="Numele listei" />
            <button className="btn" disabled={!rename.trim() || rename.trim() === current.name}>Redenumește</button>
          </form>
          <button className="btn wide" onClick={() => onOpen('aisles')}>Raioanele listei</button>
          <button className="btn wide" onClick={() => onOpen('history')}>Istoric cumpărături</button>
          {canDelete && <button className="btn danger wide" onClick={del}>Șterge lista</button>}
        </>
      )}

      <div className="menu-links">
        <button className="btn wide" onClick={() => onOpen('invite-app')}>Invită o familie nouă</button>
        {!isInstalled() && <button className="btn wide" onClick={() => onOpen('install')}>Pune aplicația pe ecran</button>}
        <button className="btn wide" onClick={() => onOpen('settings')}>Setări și aspect</button>
        {admin && <button className="btn wide" onClick={() => onOpen('admin')}>Administrare</button>}
      </div>

      <div className="account">
        <div className="avatar" aria-hidden="true">
          {user.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer" /> : firstName(user.name)[0]}
        </div>
        <div className="grow">
          <div>{user.name}{admin && <span className="badge">admin</span>}</div>
          <div className="muted small">{user.email}</div>
        </div>
        <button className="btn small" onClick={() => api.signOut()}>Ieși</button>
      </div>
    </Sheet>
  )
}

// ---------- Cine vede lista ----------

export function ShareSheet({ list, user, admin, onClose }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [invited, setInvited] = useState(null)
  const isOwner = list.ownerUid === user.uid
  const canRemove = isOwner || admin

  function submit(e) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast('Adresa de email nu pare validă'); return }
    if (list.memberEmails.includes(v)) { toast('Persoana are deja acces'); return }
    api.invite(list, user, v)
    setEmail('')
    setInvited(v)
  }

  function kick(m) {
    if (!window.confirm(`Scoți accesul pentru ${m} la lista „${list.name}”?`)) return
    api.removeMember(list.id, m)
  }

  function leave() {
    if (!window.confirm(`Ieși din lista „${list.name}”? Nu o mai vezi până nu te invită cineva din nou.`)) return
    api.leaveList(list.id, user)
    onClose()
  }

  return (
    <Sheet title={`Cine vede „${list.name}”`} onClose={onClose}>
      <ul className="members">
        {list.memberEmails.map((m) => (
          <li key={m}>
            <span className="grow">
              {m}{m === user.email && <span className="muted"> (tu)</span>}
              {m === list.ownerEmail && <span className="badge">a creat lista</span>}
            </span>
            {canRemove && m !== list.ownerEmail && m !== user.email && (
              <button className="btn small danger" onClick={() => kick(m)}>Scoate</button>
            )}
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={submit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresa@gmail.com"
          autoComplete="off" autoCapitalize="off" aria-label="Email de invitat" />
        <button className="btn primary" disabled={!email.trim()}>Invită</button>
      </form>
      <p className="muted small">
        Persoana intră în aplicație cu contul Google de pe adresa asta și vede lista automat.
        {!canRemove && ' Doar cine a creat lista poate scoate oameni.'}
      </p>
      {invited && <InviteShare user={user} email={invited} listName={list.name} />}
      {!isOwner && list.memberEmails.includes(user.email) && (
        <button className="btn danger wide" onClick={leave}>Ieși din listă</button>
      )}
    </Sheet>
  )
}

// ---------- Setări ----------

export function SettingsSheet({ user, onClose }) {
  const prefs = usePrefs()
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
    <Sheet title="Setări și aspect" onClose={onClose}>
      <h3>Iconița aplicației</h3>
      <IconPicker />

      <PushSettings user={user} />

      <h3>Temă</h3>
      <div className="segmented" role="radiogroup" aria-label="Temă">
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={prefs.theme === t.id}
            className={prefs.theme === t.id ? 'on' : ''} onClick={() => setPref('theme', t.id)}>{t.label}</button>
        ))}
      </div>
      <p className="muted small">„Automat” urmează setarea telefonului.</p>

      <h3>Font</h3>
      <div className="choices" role="radiogroup" aria-label="Font">
        {FONTS.map((f) => (
          <button key={f.id} role="radio" aria-checked={prefs.font === f.id}
            className={`choice ${prefs.font === f.id ? 'active' : ''}`} style={{ fontFamily: f.css }}
            onClick={() => setPref('font', f.id)}>
            <span>{f.label}</span>
            <span className="muted">Pâine, roșii, brânză</span>
          </button>
        ))}
      </div>

      <h3>Listă</h3>
      <Switch checked={prefs.groupByAisle} onChange={(v) => setPref('groupByAisle', v)}>
        Grupează pe raioane
        <span className="muted small block">Raionul se ghicește din nume; îl poți schimba apăsând pe produs.</span>
      </Switch>
      <Switch checked={prefs.suggestions} onChange={(v) => setPref('suggestions', v)}>
        Sugestii din istoric
        <span className="muted small block">Când scrii, propune produse adăugate înainte pe lista curentă.</span>
      </Switch>
      <p className="muted small">Setările se salvează doar pe acest telefon.</p>
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
    if (!window.confirm(`Ștergi lista „${l.name}” (${products(l.itemCount)}) pentru toți membrii ei? Nu se poate anula.`)) return
    await api.deleteList(l.id)
    toast(`Lista „${l.name}” a fost ștearsă`)
  }

  function revoke(a) {
    if (!window.confirm(`Scoți accesul în aplicație pentru ${a.email}? Nu va mai putea vedea nicio listă.`)) return
    api.revokeAccess(a.email)
  }

  return (
    <Sheet title="Administrare" onClose={onClose}>
      <h3>Toate listele ({lists?.length ?? '…'})</h3>
      <p className="muted small">Vezi doar numele, membrii și câte produse au. Conținutul îl văd doar membrii.</p>
      <ul className="members">
        {lists?.map((l) => (
          <li key={l.id}>
            <span className="grow">
              <b>{l.name}</b> <span className="muted small">· {products(l.itemCount)}</span>
              <span className="muted small block">{l.memberEmails.join(', ')}</span>
            </span>
            <button className="btn small danger" onClick={() => del(l)}>Șterge</button>
          </li>
        ))}
      </ul>

      <h3>Persoane cu acces ({allowed?.length ?? '…'})</h3>
      <p className="muted small">Primesc acces automat când îi invită cineva într-o listă. Tu, ca admin, ai acces oricum.</p>
      <ul className="members">
        {allowed?.map((a) => (
          <li key={a.email}>
            <span className="grow">
              {a.email}
              <span className="muted small block">invitat de {a.invitedByEmail === user.email ? 'tine' : a.invitedByEmail}{a.at ? ` · ${relTime(a.at)}` : ''}</span>
            </span>
            {a.email !== user.email && <button className="btn small danger" onClick={() => revoke(a)}>Scoate</button>}
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
      if (on) { await api.enablePush(user); toast('Notificările sunt pornite pe acest telefon') }
      else await api.disablePush()
    } catch (e) { toast(errText(e)) }
    setStatus(api.pushStatus())
    setBusy(false)
  }

  return (
    <>
      <h3>Notificări</h3>
      {status === 'on' || status === 'off' ? (
        <Switch checked={status === 'on'} onChange={(v) => !busy && toggle(v)}>
          Primește anunțuri pe acest telefon
          <span className="muted small block">Când cineva apasă „Anunță” după ce a lucrat pe o listă comună.</span>
        </Switch>
      ) : (
        <p className="muted small">
          {status === 'needs-install' && 'Pe iPhone, notificările merg doar din aplicația adăugată pe ecran (Share → Add to Home Screen). Deschide-o de acolo și pornește-le aici.'}
          {status === 'denied' && 'Notificările sunt blocate pentru aplicație. Le poți permite din setările telefonului (Notificări → DuoShopping sau Chrome).'}
          {status === 'unsupported' && (api.isDemo ? 'În modul demo nu există notificări.' : 'Browserul ăsta nu permite notificări.')}
        </p>
      )}
    </>
  )
}

// ---------- „Gata, anunță” ----------

const DAY = 24 * 3600 * 1000

export function AnnounceSheet({ list, user, onClose }) {
  const toast = useToast()
  const key = `anunt-${list.id}-${user.uid}`
  const since = Math.max(store.get(key, 0), Date.now() - DAY)
  const [items, setItems] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => api.watchItems(list.id, setItems, (e) => toast(errText(e))), [list.id, toast])

  const others = list.memberEmails.filter((m) => m !== user.email)
  const summary = items ? sessionSummary(items, user, since) : null
  const text = summary ? [summary.text, note.trim()].filter(Boolean).join('\n') : ''

  const [err, setErr] = useState('')

  async function send(message, remember) {
    setBusy(true)
    setErr('')
    const res = await sendAnnounce(list.id, message, toast)
    setBusy(false)
    if (res.ok) {
      if (remember) store.set(key, Date.now())
      onClose()
    } else setErr(res.error) // fereastra rămâne deschisă, ca să poți încerca din nou
  }

  return (
    <Sheet title="Gata, anunță" onClose={onClose}>
      {!others.length ? (
        <p className="muted">Ești singur în lista „{list.name}”. Invită pe cineva ca să aibă cine primi anunțul.</p>
      ) : (
        <>
          <p className="muted small">Ceilalți din „{list.name}” primesc o singură notificare cu ce ai făcut de la ultimul tău anunț.</p>
          <div className="announce-preview">
            <b>{list.name}</b>
            <span>{summary ? summary.text : 'Se încarcă…'}</span>
            {note.trim() && <span>{note.trim()}</span>}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={150}
            placeholder="Mesaj opțional, ex. Am luat tot, mai lipsește pâinea" aria-label="Mesaj opțional" />
          {err && <p className="error">{err}</p>}
          <button className="btn primary wide" disabled={busy || !summary} onClick={() => send(text, true)}>
            {busy ? 'Se trimite…' : 'Trimite anunțul'}
          </button>
          <button className="btn wide" disabled={busy} onClick={() => send(atShopText(user), false)}>
            Anunță doar că sunt la magazin
          </button>
        </>
      )}
    </Sheet>
  )
}

export const atShopText = (user) => `${firstName(user.name)} e la magazin. Dacă mai lipsește ceva, adaugă acum în listă.`

// Trimite un anunț și arată rezultatul. Întoarce { ok } sau { ok: false, error } (mesaj clar că n-a plecat).
export async function sendAnnounce(listId, text, toast) {
  try {
    const r = await api.announce(listId, text)
    if (r.demo) toast('În modul demo nu se trimit notificări')
    else if (r.phones > 0) toast(r.withoutPhone.length ? `Trimis. Fără notificări pornite: ${r.withoutPhone.join(', ')}` : 'Anunț trimis')
    else toast('Anunțul n-a ajuns la nimeni: nimeni din listă nu are notificările pornite')
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
  const [rows, setRows] = useState(() => listAisles(list).map((a) => ({ ...a, keywords: (a.keywords || []).join(', ') })))
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('🛒')

  const edit = (i, patch) => setRows((r) => r.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    setRows((r) => { const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  function remove(i) {
    if (!window.confirm(`Ștergi raionul „${rows[i].label}”? Produsele din el trec la „Altele”.`)) return
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
    if (rows.some((a) => !a.label.trim())) { toast('Fiecare raion trebuie să aibă un nume'); return }
    const aisles = rows.map((a) => {
      const keywords = a.keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 30)
      return { id: a.id, label: a.label.trim().slice(0, 40), icon: (a.icon.trim() || '🛒').slice(0, 8), ...(keywords.length ? { keywords } : {}) }
    })
    api.setListAisles(list.id, aisles)
    toast('Raioanele au fost salvate')
    onClose()
  }
  function reset() {
    if (!window.confirm('Revii la cele 14 raioane implicite? Raioanele adăugate de voi se pierd.')) return
    setRows(AISLES.map((a) => ({ ...a, keywords: '' })))
  }

  return (
    <Sheet title={`Raioanele din „${list.name}”`} onClose={onClose}>
      <p className="muted small">Pune-le în ordinea în care treci prin magazin. Modificările se văd la toți cei din listă.</p>
      <ul className="aisle-edit">
        {rows.map((a, i) => (
          <li key={a.id}>
            <div className="row tight">
              <input className="emoji-in" value={a.icon} onChange={(e) => edit(i, { icon: e.target.value })} aria-label="Emoji" maxLength={8} />
              <input className="grow" value={a.label} onChange={(e) => edit(i, { label: e.target.value })} aria-label="Numele raionului" maxLength={40} />
              <div className="order-btns">
                <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Mută „${a.label}” mai sus`}><IconUp /></button>
                <button type="button" className="icon-btn sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Mută „${a.label}” mai jos`}><IconChevron /></button>
              </div>
            </div>
            <div className="row tight">
              <input className="grow small-in" value={a.keywords} onChange={(e) => edit(i, { keywords: e.target.value })}
                placeholder="Cuvinte-cheie (opțional), ex. nutella, pufuleți" aria-label={`Cuvinte-cheie pentru „${a.label}”`} />
              {a.id !== DEFAULT_AISLE && <button type="button" className="btn small danger" onClick={() => remove(i)}>Șterge</button>}
            </div>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <input className="emoji-in" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} aria-label="Emoji pentru raionul nou" maxLength={8} />
        <input className="grow" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Raion nou, ex. Bio" maxLength={40} />
        <button className="btn" disabled={!newLabel.trim()}>Adaugă</button>
      </form>
      <p className="muted small">Cuvintele-cheie ajută la ghicit: un produs care începe cu unul dintre ele ajunge direct în raionul ăsta.</p>
      <div className="row">
        <button type="button" className="btn" onClick={reset}>Implicite</button>
        <button type="button" className="btn primary grow" onClick={save}>Salvează</button>
      </div>
    </Sheet>
  )
}
// ---------- Istoric cumpărături ----------

const dayLabel = (ms) => {
  const d = new Date(ms), today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Azi'
  if (d.toDateString() === y.toDateString()) return 'Ieri'
  return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
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
    const aisle = aisles.some((a) => a.id === item.aisle) ? item.aisle : guessAisle(item.name, aisles)
    api.addItem(list.id, user, { name: item.name, quantity: item.quantity || '', note: item.note || '', aisle })
    toast(`„${item.name}” e din nou pe listă`)
  }

  const days = []
  for (const it of history || []) {
    const label = it.resolvedAt ? dayLabel(it.resolvedAt) : 'Fără dată'
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1).items.push(it)
  }

  return (
    <Sheet title={`Istoric: ${list.name}`} onClose={onClose}>
      {history === null && <p className="center muted">Se încarcă…</p>}
      {history?.length === 0 && <p className="muted">Încă nimic aici. Produsele apar în istoric după „Golește rezolvatele”.</p>}
      {days.map((d) => (
        <section key={d.label}>
          <h3>{d.label}</h3>
          <ul className="members">
            {d.items.map((it) => (
              <li key={it.id}>
                <span className="grow">
                  {it.name}{it.quantity && <span className="muted"> · {it.quantity}</span>}
                  <span className="muted small block">
                    {it.status === 'bought' ? `cumpărat de ${firstName(it.resolvedBy?.name)}` : `${reasonLabel(it)} · ${firstName(it.resolvedBy?.name)}`}
                  </span>
                </span>
                {onList.has(normalize(it.name))
                  ? <span className="muted small">pe listă</span>
                  : <button className="btn small" onClick={() => readd(it)}>Adaugă</button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {history?.length === 200 && <p className="muted small">Se văd ultimele 200 de produse.</p>}
    </Sheet>
  )
}
