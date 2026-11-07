// Tot ce ușurează venirea unor oameni noi: invitația trimisă pe WhatsApp, ghidul de instalare
// pe ecranul principal, avertismentul pentru browserele din aplicații și sfaturile de început.
import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { Sheet, store, useToast, firstName, errText, useBackClose } from './ui.jsx'
import { usePrefs, setPref } from './prefs.js'
import { ICON_DESIGNS, ICON_COLORS, iconDataUrl } from './appIcons.js'
import { speechSupported } from './voice.js'
import { t, lang, LANGS } from './i18n.jsx'

// Adresa pe care o trimitem în invitații (VITE_APP_URL, altfel adresa curentă).
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

// ---------- Ce telefon și ce browser avem ----------

const ua = navigator.userAgent
export const device = {
  ios: /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
  android: /Android/.test(ua),
  // Browserele din interiorul altor aplicații (Facebook, Instagram, WhatsApp etc.). Google nu permite
  // logarea din ele, iar pe iPhone nu se poate instala aplicația de acolo.
  inApp: /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Messenger|Line\/|Snapchat|TikTok|musical_ly|GSA\/|; wv\)/i.test(ua),
  iosOtherBrowser: /CriOS|FxiOS|EdgiOS/.test(ua),
}
device.mobile = device.ios || device.android
// Pe Android instalăm doar din Chrome: din alte browsere (Samsung Internet, Firefox, Opera…) aplicația
// instalată poate fi blocată de telefon ca „aplicație nesigură”. Linkurile din WhatsApp se deschid în
// browserul implicit, care pe Samsung e de obicei Samsung Internet.
device.androidOtherBrowser = device.android && !device.inApp
  && (!/Chrome\//.test(ua) || /SamsungBrowser|OPR\/|Opera|EdgA|YaBrowser|MiuiBrowser|HuaweiBrowser|HeyTapBrowser|VivoBrowser|UCBrowser|DuckDuckGo|Brave/i.test(ua))
// Browserul în care nu se poate instala cum trebuie: trebuie deschis linkul în Safari sau Chrome.
device.wrongBrowser = device.inApp || device.androidOtherBrowser

export const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// Android (Chrome) oferă instalarea printr-un eveniment pe care îl păstrăm pentru butonul nostru.
let installPrompt = null
const promptListeners = new Set()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installPrompt = e
  promptListeners.forEach((f) => f())
})
window.addEventListener('appinstalled', () => {
  installPrompt = null
  promptListeners.forEach((f) => f())
})
function useInstallPrompt() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    promptListeners.add(f)
    return () => promptListeners.delete(f)
  }, [])
  return installPrompt
}

// ---------- Invitația ----------

// Merge și pentru cine are deja aplicația (nu putem ști dinainte), și pentru cine o instalează acum.
export function inviteText({ fromName, email, listName }) {
  const who = firstName(fromName)
  const head = listName ? t('inviteListHead', who, listName) : t('inviteAppHead', who)
  return [...head, ...t('inviteSteps', APP_URL, email)].join('\n')
}

export async function shareText(text, toast) {
  try {
    if (navigator.share) { await navigator.share({ text }); return }
    await navigator.clipboard.writeText(text)
    toast(t('inviteCopied'))
  } catch (e) {
    if (e?.name !== 'AbortError') toast(t('shareFailed'))
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteAppSheet({ user, onClose }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [invited, setInvited] = useState(null)

  function submit(e) {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!EMAIL_RE.test(v)) { toast(t('invalidEmail')); return }
    if (v === user.email) { toast(t('ownEmail')); return }
    api.inviteToApp(user, v)
    setInvited(v)
    setEmail('')
  }

  return (
    <Sheet title={t('inviteFamily')} onClose={onClose}>
      <p className="muted small">{t('inviteFamilyHint')}</p>
      <form className="row" onSubmit={submit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPh')}
          autoComplete="off" autoCapitalize="off" aria-label={t('inviteEmailLabel')} />
        <button className="btn primary" disabled={!email.trim()}>{t('invite')}</button>
      </form>
      {invited && <InviteShare user={user} email={invited} />}
    </Sheet>
  )
}

// Pasul de după invitare: trimiterea mesajului cu linkul și instrucțiunile.
export function InviteShare({ user, email, listName }) {
  const toast = useToast()
  const text = inviteText({ fromName: user.name, email, listName })
  return (
    <div className="invite-done">
      <p>{t('inviteDone', email)}</p>
      <div className="announce-preview small">{text}</div>
      <button className="btn primary wide" onClick={() => shareText(text, toast)}>
        {t('sendInvite')}
      </button>
    </div>
  )
}

// ---------- Instalarea pe ecranul principal ----------

export function InstallSheet({ onClose }) {
  return (
    <Sheet title={t('installApp')} onClose={onClose}>
      <p className="muted small">{t('installIntro')}</p>
      {!isInstalled() && !device.wrongBrowser && device.mobile && (
        <>
          <h3>{t('pickIconFirst')}</h3>
          <IconPicker />
          <h3>{t('then')}</h3>
        </>
      )}
      <InstallSteps onInstalled={onClose} />
    </Sheet>
  )
}

// Pașii de instalare potriviți telefonului și browserului.
function InstallSteps({ onInstalled }) {
  const prompt = useInstallPrompt()
  const toast = useToast()

  async function install() {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') { toast(t('installedToast')); onInstalled?.() }
  }

  if (isInstalled()) return <p>{t('alreadyInstalled')}</p>
  if (device.inApp) return <InAppSteps />
  if (device.androidOtherBrowser) return <OtherBrowserSteps />
  if (device.ios) {
    return (
      <ol className="steps">
        {device.iosOtherBrowser && <li>{t('iosSafariFirst')}</li>}
        <li>{t('iosShare', device.iosOtherBrowser)}</li>
        <li>{t('iosAddHome')}</li>
        <li>{t('iosAdd')}</li>
        <li>{t('iosThenLogin')}</li>
      </ol>
    )
  }
  if (prompt) return <button className="btn primary wide" onClick={install}>{t('installButton')}</button>
  if (device.android) {
    return (
      <ol className="steps">
        <li>{t('androidChrome')}</li>
        <li>{t('androidMenu')}</li>
        <li>{t('androidInstall')}</li>
        <li>{t('openFromHome')}</li>
      </ol>
    )
  }
  return <p>{t('desktopInstall')}</p>
}

// ---------- Ecranul de bun venit ----------
// Pe telefon, în browser, înainte de login: ce face aplicația, iconița și instalarea. Login-ul se face
// apoi o singură dată, în aplicația de pe ecran (pe iPhone, aceea nu preia login-ul din Safari).

const BROWSER_KEY = 'continua-in-browser'
export const showWelcome = () => device.mobile && !isInstalled() && !store.get(BROWSER_KEY, false)

export function Welcome({ logo, onContinue }) {
  return (
    <main className="welcome">
      {logo}
      <h1>DuoShopping</h1>
      <p className="muted">{t('welcomeTagline')}</p>
      <LangPicker compact />
      <ul className="features">
        <li><span aria-hidden="true">🔄</span> {t('featSync')}</li>
        <li><span aria-hidden="true">🔔</span> {t('featAnnounce')}</li>
        <li><span aria-hidden="true">🛒</span> {t('featAisles')}</li>
        <li><span aria-hidden="true">💬</span> {t('featChat')}</li>
      </ul>
      {device.wrongBrowser ? (
        <div className="warn-box">
          <b>{t('openIn', device.ios ? 'Safari' : 'Chrome')}</b>
          {device.inApp ? <InAppSteps /> : <OtherBrowserSteps />}
        </div>
      ) : (
        <div className="welcome-steps">
          <h3>{t('step1Icon')}</h3>
          <IconPicker />
          <h3>{t('step2Install')}</h3>
          <InstallSteps />
          <h3>{t('step3Login')}</h3>
          <p className="small">{t('step3Text')}</p>
        </div>
      )}
      <button className="link-btn" onClick={() => { store.set(BROWSER_KEY, true); onContinue() }}>
        {t('continueBrowser')}
      </button>
    </main>
  )
}

function useCopyLink() {
  const toast = useToast()
  return async () => {
    try { await navigator.clipboard.writeText(APP_URL); toast(t('linkCopied')) } catch { toast(APP_URL) }
  }
}

// Link care deschide pagina direct în Chrome, pe Android (merge din Samsung Internet și majoritatea browserelor).
function chromeIntentUrl() {
  const u = new URL(APP_URL)
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`
}

// Android, dar alt browser decât Chrome.
function OtherBrowserSteps() {
  const copy = useCopyLink()
  return (
    <>
      <ol className="steps">
        <li>{t('otherBrowser1')}</li>
        <li>{t('otherBrowser2')}</li>
        <li>{t('otherBrowser3')}</li>
      </ol>
      <a className="btn primary wide" href={chromeIntentUrl()}>{t('openInChrome')}</a>
      <button className="btn wide" onClick={copy}>{t('copyLink')}</button>
    </>
  )
}

function InAppSteps() {
  const copy = useCopyLink()
  return (
    <>
      <ol className="steps">
        <li>{t('inApp1', device.ios)}</li>
        <li>{t('inApp2', device.ios ? 'Safari' : 'Chrome')}</li>
        <li>{t('inApp3', device.ios ? 'Safari' : 'Chrome')}</li>
      </ol>
      <button className="btn wide" onClick={copy}>{t('copyLink')}</button>
    </>
  )
}

// Pe ecranul de login: dacă e un browser din altă aplicație, logarea cu Google oricum ar eșua.
export function InAppWarning() {
  if (!device.inApp) return null
  return (
    <div className="warn-box">
      <b>{t('openIn', device.ios ? 'Safari' : 'Chrome')}</b>
      <InAppSteps />
    </div>
  )
}

// Fâșie discretă pe telefoanele unde aplicația nu e încă instalată.
const INSTALL_HIDE_KEY = 'ascunde-instalare'
export function InstallBanner({ onOpen }) {
  const [hidden, setHidden] = useState(() => store.get(INSTALL_HIDE_KEY, false))
  if (hidden || isInstalled() || !device.mobile) return null
  return (
    <div className="hint-bar">
      <button className="grow hint-main" onClick={onOpen}>{t('installBanner', device.ios)}</button>
      <button className="btn small" onClick={() => { store.set(INSTALL_HIDE_KEY, true); setHidden(true) }}>{t('notNow')}</button>
    </div>
  )
}

// ---------- Sfaturi la început ----------
// La prima pornire, ca fereastră în mijlocul ecranului; îndemnul la notificări vine abia după ea.

const TIPS_KEY = 'sfaturi-vazute'
export const tipsSeen = () => store.get(TIPS_KEY, false)

export function Tips({ onDone }) {
  const done = () => { store.set(TIPS_KEY, true); onDone() }
  useBackClose(done)
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label={t('tipsTitle')}>
        <h2>{t('tipsTitle')}</h2>
        <ul className="features">
          <li><span aria-hidden="true">✍️</span> {t('tipWrite', speechSupported())}</li>
          <li><span aria-hidden="true">🔔</span> {t('tipBell')}</li>
          <li><span aria-hidden="true">🛒</span> {t('tipShop')}</li>
          <li><span aria-hidden="true">☰</span> {t('tipMenu')}</li>
        </ul>
        <button className="btn primary wide big" onClick={done}>{t('gotIt')}</button>
      </section>
    </div>
  )
}

// ---------- Alegerea iconiței ----------
// iPhone-ul ia iconița o singură dată, când adaugi aplicația pe ecran; după aceea nu o mai schimbă.

export function IconPicker() {
  const prefs = usePrefs()
  if (device.ios && isInstalled()) {
    return (
      <p className="muted small">{t('iconIosFixed', APP_URL)}</p>
    )
  }
  return (
    <>
      <div className="icon-grid" role="radiogroup" aria-label={t('iconDesign')}>
        {ICON_DESIGNS.map((d) => (
          <button key={d.id} role="radio" aria-checked={prefs.icon === d.id}
            className={`icon-pick ${prefs.icon === d.id ? 'active' : ''}`} onClick={() => setPref('icon', d.id)}>
            <img src={iconDataUrl(d.id, prefs.iconColor)} alt="" />
            <span>{t(`icon.${d.id}`)}</span>
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label={t('iconColor')}>
        {ICON_COLORS.map((c) => (
          <button key={c.id} role="radio" aria-checked={prefs.iconColor === c.id} aria-label={t(`color.${c.id}`)} title={t(`color.${c.id}`)}
            className={`swatch ${prefs.iconColor === c.id ? 'active' : ''}`} style={{ background: c.bg }}
            onClick={() => setPref('iconColor', c.id)} />
        ))}
      </div>
      <p className="muted small">
        {device.ios ? t('iconHintIos') : isInstalled() ? t('iconHintAndroid') : t('iconHintInstall')}
      </p>
    </>
  )
}

// ---------- Îndemn la notificări ----------
// Fără notificări, celălalt nu află când ai terminat lista sau când ești la magazin.

// Cheie nouă de la 2.2: după mutarea pe adresa nouă, îndemnul reapare o dată pentru cine n-a pornit notificările aici.
const PUSH_HIDE_KEY = 'ascunde-notificari-2'
export function PushPrompt({ user }) {
  const toast = useToast()
  const [status, setStatus] = useState(() => api.pushStatus())
  const [hidden, setHidden] = useState(() => store.get(PUSH_HIDE_KEY, false))
  const [busy, setBusy] = useState(false)
  if (hidden || status !== 'off') return null

  async function enable() {
    setBusy(true)
    try { await api.enablePush(user); toast(t('pushOn')) } catch (e) { toast(errText(e)) }
    setStatus(api.pushStatus())
    setBusy(false)
  }

  return (
    <section className="tips push-prompt">
      <h3>{t('pushPromptTitle')}</h3>
      <p className="small">{t('pushPromptText')}</p>
      <div className="row">
        <button className="btn primary small" disabled={busy} onClick={enable}>{t('turnOn')}</button>
        <button className="btn small" onClick={() => { store.set(PUSH_HIDE_KEY, true); setHidden(true) }}>{t('notNow')}</button>
      </div>
    </section>
  )
}

// ---------- Alegerea limbii ----------
// În Setări, și discret pe ecranele de dinainte de login (bun venit, intrare), ca un vorbitor de engleză
// să nu treacă prin tot onboarding-ul în română. Se salvează ca orice altă preferință (și în cont).

export function LangPicker({ compact = false }) {
  usePrefs()
  const current = lang()
  return (
    <div className={`segmented ${compact ? 'lang-compact' : ''}`} role="radiogroup" aria-label={t('language')}>
      {LANGS.map((l) => (
        <button key={l.id} role="radio" aria-checked={current === l.id} lang={l.id}
          className={current === l.id ? 'on' : ''} onClick={() => setPref('lang', l.id)}>{l.label}</button>
      ))}
    </div>
  )
}

