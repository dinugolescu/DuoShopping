// Tot ce ușurează venirea unor oameni noi: invitația trimisă pe WhatsApp, ghidul de instalare
// pe ecranul principal, avertismentul pentru browserele din aplicații și sfaturile de început.
import { useEffect, useState } from 'react'
import * as api from './data/index.js'
import { Sheet, store, useToast, firstName } from './ui.jsx'

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

export function inviteText({ fromName, email, listName }) {
  const why = listName ? `ca să vezi lista noastră „${listName}”` : 'ca să-ți faci propria listă de cumpărături, comună cu familia'
  return [
    `${firstName(fromName)} te-a invitat în DuoShopping, ${why}.`,
    '',
    `1. Deschide linkul: ${APP_URL}`,
    '   Pe iPhone deschide-l în Safari, pe Android în Chrome (nu în browserul din WhatsApp sau Facebook).',
    `2. Apasă „Intră cu Google” și alege contul ${email}.`,
    '3. Pune aplicația pe ecranul principal: pe iPhone butonul Partajează → „Adaugă pe ecranul principal”, pe Android meniul ⋮ → „Instalează aplicația”.',
  ].join('\n')
}

export async function shareText(text, toast) {
  try {
    if (navigator.share) { await navigator.share({ text }); return }
    await navigator.clipboard.writeText(text)
    toast('Invitația e copiată. Lipește-o în WhatsApp sau într-un mesaj.')
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Nu am putut deschide trimiterea. Încearcă din nou.')
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
    if (!EMAIL_RE.test(v)) { toast('Adresa de email nu pare validă'); return }
    if (v === user.email) { toast('Asta e adresa ta'); return }
    api.inviteToApp(user, v)
    setInvited(v)
    setEmail('')
  }

  return (
    <Sheet title="Invită o familie nouă" onClose={onClose}>
      <p className="muted small">
        Persoana primește acces în aplicație și își face propria listă, pe care o împarte cu cine vrea ea.
        Nu vede listele tale. Dacă vrei să vadă o listă de-a ta, invit-o din butonul cu oameni de sus.
      </p>
      <form className="row" onSubmit={submit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresa@gmail.com"
          autoComplete="off" autoCapitalize="off" aria-label="Email de invitat" />
        <button className="btn primary" disabled={!email.trim()}>Invită</button>
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
      <p><b>{email}</b> are acces acum. Aplicația nu trimite emailuri, așa că trimite-i tu invitația:</p>
      <div className="announce-preview small">{text}</div>
      <button className="btn primary wide" onClick={() => shareText(text, toast)}>
        Trimite invitația (WhatsApp, SMS…)
      </button>
    </div>
  )
}

// ---------- Instalarea pe ecranul principal ----------

export function InstallSheet({ onClose }) {
  const prompt = useInstallPrompt()
  const toast = useToast()

  async function install() {
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') { toast('Gata, o găsești pe ecranul principal'); onClose() }
  }

  return (
    <Sheet title="Pune aplicația pe ecran" onClose={onClose}>
      <p className="muted small">
        Instalată, DuoShopping se deschide pe tot ecranul, ca o aplicație obișnuită, și poate primi notificări.
      </p>
      {isInstalled() ? (
        <p>Aplicația e deja instalată pe acest telefon.</p>
      ) : device.inApp ? (
        <InAppSteps />
      ) : device.ios ? (
        <ol className="steps">
          {device.iosOtherBrowser && <li>Cel mai sigur merge din <b>Safari</b>: copiază linkul și deschide-l acolo.</li>}
          <li>Apasă butonul <b>Partajează</b> (pătratul cu săgeata în sus{device.iosOtherBrowser ? ', din bara de adresă' : ', jos în mijloc'}).</li>
          <li>Derulează și alege <b>„Adaugă pe ecranul principal”</b>.</li>
          <li>Apasă <b>„Adaugă”</b>, apoi deschide DuoShopping de pe ecran, nu din browser.</li>
        </ol>
      ) : prompt ? (
        <button className="btn primary wide" onClick={install}>Instalează DuoShopping</button>
      ) : device.android ? (
        <ol className="steps">
          <li>Deschide linkul în <b>Chrome</b>.</li>
          <li>Apasă meniul <b>⋮</b> din dreapta sus.</li>
          <li>Alege <b>„Instalează aplicația”</b> sau <b>„Adaugă pe ecranul principal”</b>, apoi <b>„Instalează”</b>.</li>
        </ol>
      ) : (
        <p>Pe calculator, folosește iconița de instalare din bara de adresă a browserului (Chrome sau Edge).</p>
      )}
    </Sheet>
  )
}

function InAppSteps() {
  const toast = useToast()
  async function copy() {
    try { await navigator.clipboard.writeText(APP_URL); toast('Link copiat') } catch { toast(APP_URL) }
  }
  return (
    <>
      <ol className="steps">
        <li>Ești în browserul din altă aplicație (WhatsApp, Facebook…). De aici Google nu permite logarea{device.ios ? ' și nu se poate instala aplicația' : ''}.</li>
        <li>Apasă meniul <b>⋯</b> sau <b>⋮</b> din colț și alege <b>„Deschide în {device.ios ? 'Safari' : 'Chrome'}”</b> (sau „Deschide în browser”).</li>
        <li>Dacă nu găsești opțiunea, copiază linkul și lipește-l în {device.ios ? 'Safari' : 'Chrome'}.</li>
      </ol>
      <button className="btn wide" onClick={copy}>Copiază linkul</button>
    </>
  )
}

// Pe ecranul de login: dacă e un browser din altă aplicație, logarea cu Google oricum ar eșua.
export function InAppWarning() {
  if (!device.inApp) return null
  return (
    <div className="warn-box">
      <b>Deschide linkul în {device.ios ? 'Safari' : 'Chrome'}</b>
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
      <button className="grow hint-main" onClick={onOpen}>📲 Pune DuoShopping pe ecranul principal</button>
      <button className="btn small" onClick={() => { store.set(INSTALL_HIDE_KEY, true); setHidden(true) }}>Nu acum</button>
    </div>
  )
}

// ---------- Sfaturi la început ----------

const TIPS_KEY = 'sfaturi-vazute'
export function Tips() {
  const [seen, setSeen] = useState(() => store.get(TIPS_KEY, false))
  if (seen) return null
  return (
    <section className="tips">
      <h3>Pe scurt, cum merge</h3>
      <ul>
        <li><span aria-hidden="true">✍️</span> Scrie ce lipsește. Produsele se așază singure pe raioane.</li>
        <li><span aria-hidden="true">🔔</span> Când termini de completat, apasă clopoțelul ca să-i anunți pe ceilalți.</li>
        <li><span aria-hidden="true">🛒</span> În magazin pornește „Mod magazin”: ecranul rămâne aprins cât bifezi.</li>
        <li><span aria-hidden="true">☰</span> Din meniu pui raioanele în ordinea magazinului tău și vezi istoricul.</li>
      </ul>
      <button className="btn small" onClick={() => { store.set(TIPS_KEY, true); setSeen(true) }}>Am înțeles</button>
    </section>
  )
}
