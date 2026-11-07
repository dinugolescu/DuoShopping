import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { ToastHost, useToast, errText, store } from './ui.jsx'
import { ListView } from './ListView.jsx'
import { MenuSheet, ShareSheet, SettingsSheet, AdminSheet, AnnounceSheet, AislesSheet, HistorySheet, useAnnounce } from './sheets.jsx'
import { IconChevron, IconUsers, IconBell } from './icons.jsx'
import { usePrefs, setPref, startPrefsSync } from './prefs.js' // importul aplică tema, fontul și iconița salvate, înainte de primul ecran
import { iconDataUrl } from './appIcons.js'
import { InviteAppSheet, InstallSheet, InstallBanner, InAppWarning, Tips, PushPrompt, Welcome, LangPicker, showWelcome, tipsSeen } from './onboarding.jsx'
import { t } from './i18n.jsx'

export default function App() {
  return (
    <ToastHost>
      <Root />
    </ToastHost>
  )
}

function Root() {
  usePrefs() // la schimbarea limbii re-randăm tot arborele, ca textele să treacă pe noua limbă
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

  if (user === undefined) return <div className="center muted">{t('loading')}</div>
  if (!user) return <Login />
  if (!access) return <div className="center muted">{t('checkingAccess')}</div>
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
      <p className="muted">{t('tagline')}</p>
      {api.isDemo ? (
        <>
          <p className="demo-note">{t('demoNote')}</p>
          {api.DEMO_USERS.map((u, i) => (
            <button key={u.uid} className="btn primary wide" disabled={busy} onClick={() => go(i)}>
              {t('signInAs', u.name)}
            </button>
          ))}
        </>
      ) : (
        <button className="btn primary wide" disabled={busy} onClick={() => go()}>
          {t('signInGoogle')}
        </button>
      )}
      {err && <p className="error">{err}</p>}
      <InAppWarning />
      <LangPicker compact />
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
      <h1>{t('noAccessTitle')}</h1>
      <p className="muted">{t('noAccessBody', user.email)}</p>
      <button className="btn wide" onClick={() => api.signOut()}>{t('otherAccount')}</button>
      <LangPicker compact />
    </main>
  )
}


// Lista cerută în adresă (de la o notificare). O citim o dată și curățăm adresa.
function listFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('list')
  if (id) {
    params.delete('list')
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
  }
  return id
}
const START_LIST = listFromUrl()

function Home({ user, admin }) {
  const toast = useToast()
  const [lists, setLists] = useState(null)
  const order = usePrefs().listOrder
  const [currentId, setCurrentId] = useState(() => START_LIST || store.get('lista-curenta'))
  // Atingerea unei notificări deschide lista ei: prin adresă (`?list=`) sau prin mesaj de la service worker.
  useEffect(() => {
    const onMsg = (e) => { if (e.data?.type === 'open-list') { setCurrentId(e.data.listId); setSheet(null) } }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [])
  const [tipsDone, setTipsDone] = useState(tipsSeen)
  const [sheet, setSheet] = useState(null) // 'menu' | 'share' | 'announce' | 'settings' | 'admin' | null

  useEffect(() => startPrefsSync(user.uid, api), [user.uid])
  // Nu mai facem automat o listă la prima intrare: cine e invitat de familie ar fi ajuns cu două
  // liste „Cumpărături”. Cine n-are nicio listă vede ecranul gol, cu „Începe lista”.
  useEffect(() => api.watchLists(user, setLists, (e) => toast(errText(e))), [user.uid, user.email, toast])

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

  // După crearea unei liste întrebăm imediat cu cine o împarte.
  const create = (name) => { setCurrentId(api.createList(user, name)); setSheet('share-new') }
  const close = () => setSheet(null)

  // Lista în care ești singur: scoatem în evidență invitarea, dacă n-ai spus că e personală.
  const personal = usePrefs().personalLists || []
  const alone = current && current.memberEmails.length === 1 && !personal.includes(current.id)
  const markPersonal = () => setPref('personalLists', [...personal.filter((id) => lists.some((l) => l.id === id)), current.id])

  // Câte lucruri ai făcut pe listă și n-ai anunțat (doar unde ai pe cine anunța).
  const ann = useAnnounce(current, user)
  const unannounced = current && current.memberEmails.length > 1 ? ann.pending?.length || 0 : 0

  if (!sorted) return <div className="center muted">{t('loadingLists')}</div>

  return (
    <div className="app">
      <header className="top">
        <button className="list-switch" onClick={() => setSheet('menu')} aria-label={t('pickList')}>
          <span className="list-title">{current ? current.name : 'DuoShopping'}</span>
          <IconChevron />
        </button>
        {current && (
          <button className="icon-btn" onClick={() => setSheet('announce')}
            aria-label={unannounced ? t('announceOthersN', unannounced) : t('announceOthers')}>
            <IconBell />
            {unannounced > 0 && <span className="count">{unannounced > 99 ? '99+' : unannounced}</span>}
          </button>
        )}
        {current && (
          <button className={`icon-btn ${alone ? 'alone' : ''}`} onClick={() => setSheet('share')}
            aria-label={alone ? t('aloneInvite') : t('whoSees')}>
            <IconUsers />
            {current.memberEmails.length > 1 && <span className="count">{current.memberEmails.length}</span>}
            {alone && <span className="count alert" aria-hidden="true">!</span>}
          </button>
        )}
      </header>

      <InstallBanner onOpen={() => setSheet('install')} />
      {alone && (
        <div className="hint-bar alone-bar">
          <button className="grow hint-main" onClick={() => setSheet('share')}>{t('aloneBar')}</button>
          <button className="btn small" onClick={markPersonal}>{t('itsPersonal')}</button>
        </div>
      )}
      {current && tipsDone && <PushPrompt user={user} />}
      {current && !tipsDone && <Tips onDone={() => setTipsDone(true)} />}
      {current
        ? <ListView key={current.id} list={current} user={user} />
        : <EmptyLists user={user} onCreate={create} onMenu={() => setSheet('menu')} />}

      {sheet === 'menu' && (
        <MenuSheet
          user={user} admin={admin} lists={sorted} current={current}
          onPick={(id) => { setCurrentId(id); close() }}
          onCreate={create}
          onMove={move}
          onOpen={setSheet}
          onClose={close}
        />
      )}
      {sheet === 'share' && current && <ShareSheet list={current} user={user} admin={admin} onClose={close} />}
      {sheet === 'share-new' && current?.id === currentId && <ShareSheet list={current} user={user} admin={admin} fresh onClose={close} />}
      {sheet === 'settings' && <SettingsSheet user={user} onClose={close} />}
      {sheet === 'announce' && current && <AnnounceSheet list={current} user={user} pending={ann.pending} mark={ann.mark} onClose={close} />}
      {sheet === 'admin' && admin && <AdminSheet user={user} onClose={close} />}
      {sheet === 'aisles' && current && <AislesSheet list={current} onClose={close} />}
      {sheet === 'invite-app' && <InviteAppSheet user={user} onClose={close} />}
      {sheet === 'install' && <InstallSheet onClose={close} />}
      {sheet === 'history' && current && <HistorySheet list={current} user={user} onClose={close} />}
    </div>
  )
}

function EmptyLists({ user, onCreate, onMenu }) {
  const [name, setName] = useState(() => t('firstList'))
  return (
    <main className="empty">
      <h2>{t('noListsTitle')}</h2>
      <p className="muted">{t('noListsBody', user.email)}</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name) }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('listNameLabel')} maxLength={60} />
        <button className="btn primary" disabled={!name.trim()}>{t('create')}</button>
      </form>
      <button className="btn wide" onClick={onMenu}>{t('settingsAndAccount')}</button>

    </main>
  )
}
