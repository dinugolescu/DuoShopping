import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { THEMES, FONTS, usePrefs, setPref } from './prefs.js'
import { relTime } from './time.js'
import { Sheet, Switch, firstName, useToast, errText } from './ui.jsx'
import { IconUp, IconChevron } from './icons.jsx'

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
          {canDelete && <button className="btn danger wide" onClick={del}>Șterge lista</button>}
        </>
      )}

      <div className="menu-links">
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
  const isOwner = list.ownerUid === user.uid
  const canRemove = isOwner || admin

  function submit(e) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast('Adresa de email nu pare validă'); return }
    if (list.memberEmails.includes(v)) { toast('Persoana are deja acces'); return }
    api.invite(list, user, v)
    setEmail('')
    toast(`${v} poate vedea acum lista`)
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

  async function shareLink() {
    const url = window.location.origin
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de cumpărături', text: 'Intră cu contul Google ca să vezi lista noastră.', url })
      else { await navigator.clipboard.writeText(url); toast('Link copiat') }
    } catch { /* utilizatorul a renunțat */ }
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
      <button className="btn wide" onClick={shareLink}>Trimite linkul aplicației</button>
      {!isOwner && list.memberEmails.includes(user.email) && (
        <button className="btn danger wide" onClick={leave}>Ieși din listă</button>
      )}
    </Sheet>
  )
}

// ---------- Setări ----------

export function SettingsSheet({ onClose }) {
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
