// Actualizarea automată. Versiunea nouă se descarcă în fundal (service worker cu autoUpdate), dar pagina
// deja deschisă rulează tot codul vechi. Aici verificăm la fiecare revenire în aplicație dacă e ceva nou
// și reîncărcăm pagina într-un moment liniștit: chiar la revenire sau imediat după pornire, niciodată
// cât timp cineva scrie, are o fereastră deschisă sau e în modul magazin.
import { hasOpenLayers } from './ui.jsx'

const QUIET_MS = 15000 // cât timp după pornire/revenire considerăm că omul abia a intrat
const HOURLY = 60 * 60 * 1000

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller // fără el, e prima instalare: nu reîncărcăm
  let ready = false
  let enteredAt = Date.now()

  const busy = () => {
    const a = document.activeElement
    const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.value
    return typing || hasOpenLayers() || document.querySelector('.shop-bar')
  }
  const reloadIfQuiet = () => {
    if (ready && document.visibilityState === 'visible' && Date.now() - enteredAt < QUIET_MS && !busy()) {
      window.location.reload()
    }
  }
  const check = async () => {
    try { (await navigator.serviceWorker.getRegistration())?.update() } catch { /* fără rețea: data viitoare */ }
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return
    ready = true
    reloadIfQuiet()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    enteredAt = Date.now()
    if (ready) reloadIfQuiet()
    else check()
  })
  setInterval(() => { if (document.visibilityState === 'visible') check() }, HOURLY)
}
