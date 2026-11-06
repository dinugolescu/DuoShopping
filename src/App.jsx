import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { ToastHost, useToast, errText, store } from './ui.jsx'
import { ListView } from './ListView.jsx'
import { MenuSheet, ShareSheet, SettingsSheet, AdminSheet, AnnounceSheet, AislesSheet, HistorySheet } from './sheets.jsx'
import { IconChevron, IconUsers, IconBell } from './icons.jsx'
import { usePrefs, setPref, startPrefsSync } from './prefs.js' // importul aplică tema, fontul și iconița salvate, înainte de primul ecran
import { iconDataUrl } from './appIcons.js'
import { InviteAppSheet, InstallSheet, InstallBanner, InAppWarning, Tips, PushPrompt, Welcome, showWelcome, tipsSeen } from './onboarding.jsx'

export default function App() {
  return (
    <ToastHost>
      <Root />
    </ToastHost>
  )
}

function Root() {
  const toast = useToast()
  const [user, setUser] = useState(undefined) // undefined = încă nu știm
  const [access, setAccess] = useState(null)

  useEffect(() => api.onUser(setUser), [])
  useEffect(() => {
    api.setWriteErrorHandler((e) => { console.error(e); toast(errText(e)) })
  }, [toast])
  useEffect(() => {
    setAccess(null)
    if (!user) return
    return api.watchAccess(user, setAccess)
  }, [user?.uid])

  if (user === undefined) return <div className="center muted">Se încarcă…</div>
  if (!user) return <Login />
  if (!access) return <div className="center muted">Se verifică accesul…</div>
  if (!access.allowed) return <NoAccess user={user} />
  return <Home user={user} admin={access.admin} />
}

function Login() {
  const [welcome, setWelcome] = useState(showWelcome)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function go(i) {
    setErr(''); setBusy(true)
    try { await api.signIn(i) } catch (e) { setErr(errText(e) || '') } finally { setBusy(false) }
  }
  if (welcome) return <Welcome logo={<Logo />} onContinue={() => setWelcome(false)} />
  return (
    <main className="login">
      <Logo />
      <h1>DuoShopping</h1>
      <p className="muted">Lista de cumpărături comună, sincronizată pe toate telefoanele.</p>
      {api.isDemo ? (
        <>
          <p className="demo-note">
            Mod demo: datele stau doar în acest browser. Dinu e admin; Moni, Andreea și Ștefan intră doar după ce îi invită cineva.
            Deschide mai multe taburi ca să vezi sincronizarea.
          </p>
          {api.DEMO_USERS.map((u, i) => (
            <button key={u.uid} className="btn primary wide" disabled={busy} onClick={() => go(i)}>
              Intră ca {u.name}
            </button>
          ))}
        </>
      ) : (
        <button className="btn primary wide" disabled={busy} onClick={() => go()}>
          Intră cu Google
        </button>
      )}
      {err && <p className="error">{err}</p>}
      <InAppWarning />
    </main>
  )
}

function Logo() {
  const p = usePrefs()
  return <img src={iconDataUrl(p.icon, p.iconColor)} alt="" className="login-logo" />
}

function NoAccess({ user }) {
  return (
    <main className="login">
      <Logo />
      <h1>Încă nu ai acces</h1>
      <p className="muted">
        Roagă pe cineva care folosește deja aplicația să te invite într-o listă, pe adresa <b>{user.email}</b>.
        Pagina se deschide singură imediat după invitație.
      </p>
      <button className="btn wide" onClick={() => api.signOut()}>Intră cu alt cont</button>
    </main>
  )
}

const FIRST_LIST = 'Cumpărături'

function Home({ user, admin }) {
  const toast = useToast()
  const [lists, setLists] = useState(null)
  const order = usePrefs().listOrder
  const [currentId, setCurrentId] = useState(() => store.get('lista-curenta'))
  const [tipsDone, setTipsDone] = useState(tipsSeen)
  const [sheet, setSheet] = useState(null) // 'menu' | 'share' | 'announce' | 'settings' | 'admin' | null

  useEffect(() => startPrefsSync(user.uid, api), [user.uid])
  useEffect(() => api.watchLists(user, (ls, meta) => {
    setLists(ls)
    // Prima intrare: cine n-are nicio listă primește una gata făcută. O singură dată per cont,
    // și doar după ce serverul confirmă (din cache, la început, lista poate părea goală).
    const key = `prima-lista-${user.uid}`
    if (meta?.fromCache || store.get(key)) return
    store.set(key, true)
    if (ls.length === 0) setCurrentId(api.createList(user, FIRST_LIST))
  }, (e) => toast(errText(e))), [user.uid, user.email, toast])

  // Ordinea listelor e personală: întâi cele ordonate de tine, apoi restul în ordinea creării.
  const sorted = lists && [...lists].sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
    return (a.createdAt ?? 0) - (b.createdAt ?? 0)
  })
  const current = sorted?.find((l) => l.id === currentId) || sorted?.[0] || null
  useEffect(() => { if (current) store.set('lista-curenta', current.id) }, [current?.id])

  function move(id, dir) {
    const ids = sorted.map((l) => l.id)
    const i = ids.indexOf(id), j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setPref('listOrder', ids)
  }

  const create = (name) => setCurrentId(api.createList(user, name))
  const close = () => setSheet(null)

  if (!sorted) return <div className="center muted">Se încarcă listele…</div>

  return (
    <div className="app">
      <header className="top">
        <button className="list-switch" onClick={() => setSheet('menu')} aria-label="Alege lista">
          <span className="list-title">{current ? current.name : 'DuoShopping'}</span>
          <IconChevron />
        </button>
        {current && (
          <button className="icon-btn" onClick={() => setSheet('announce')} aria-label="Gata, anunță ceilalți">
            <IconBell />
          </button>
        )}
        {current && (
          <button className="icon-btn" onClick={() => setSheet('share')} aria-label="Cine vede lista">
            <IconUsers />
            {current.memberEmails.length > 1 && <span className="count">{current.memberEmails.length}</span>}
          </button>
        )}
      </header>

      <InstallBanner onOpen={() => setSheet('install')} />
      {current && tipsDone && <PushPrompt user={user} />}
      {current && !tipsDone && <Tips onDone={() => setTipsDone(true)} />}
      {current
        ? <ListView key={current.id} list={current} user={user} />
        : <EmptyLists user={user} onCreate={create} onMenu={() => setSheet('menu')} />}

      {sheet === 'menu' && (
        <MenuSheet
          user={user} admin={admin} lists={sorted} current={current}
          onPick={(id) => { setCurrentId(id); close() }}
          onCreate={(name) => { create(name); close() }}
          onMove={move}
          onOpen={setSheet}
          onClose={close}
        />
      )}
      {sheet === 'share' && current && <ShareSheet list={current} user={user} admin={admin} onClose={close} />}
      {sheet === 'settings' && <SettingsSheet user={user} onClose={close} />}
      {sheet === 'announce' && current && <AnnounceSheet list={current} user={user} onClose={close} />}
      {sheet === 'admin' && admin && <AdminSheet user={user} onClose={close} />}
      {sheet === 'aisles' && current && <AislesSheet list={current} onClose={close} />}
      {sheet === 'invite-app' && <InviteAppSheet user={user} onClose={close} />}
      {sheet === 'install' && <InstallSheet onClose={close} />}
      {sheet === 'history' && current && <HistorySheet list={current} user={user} onClose={close} />}
    </div>
  )
}

function EmptyLists({ user, onCreate, onMenu }) {
  const [name, setName] = useState(FIRST_LIST)
  return (
    <main className="empty">
      <h2>Nicio listă încă</h2>
      <p className="muted">
        Creează o listă nouă sau roagă pe cineva să te invite pe adresa <b>{user.email}</b>.
      </p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name) }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Numele listei" maxLength={60} />
        <button className="btn primary" disabled={!name.trim()}>Creează</button>
      </form>
      <button className="btn wide" onClick={onMenu}>Setări și cont</button>
    </main>
  )
}
