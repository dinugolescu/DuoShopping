// Link-uri de produse: lipite în câmpul de adăugare sau trimise din alte aplicații (Share pe Android).
// Numele produsului îl ghicim din adresa paginii (din telefon nu putem citi pagina altui site);
// dacă nu iese nimic, produsul se numește „Produs necunoscut N”, iar link-ul rămâne la el.
import { t } from './i18n.jsx'

export const safeLink = (url) => (/^https?:\/\/\S+$/i.test(url || '') ? url : null)

// Primul link dintr-un text („Uite asta: https://…”).
export function findUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i)
  return m ? m[0].replace(/[).,;!?]+$/, '') : null
}

// Bucăți de adresă care nu sunt nume de produs.
const JUNK = new Set([
  'p', 'pd', 'dp', 'gp', 'product', 'products', 'produs', 'produse', 'item', 'items', 'itm', 'shop', 'store',
  'ro', 'en', 'en-us', 'ro-ro', 'www', 'index', 'html', 'php', 'details', 'detail', 'catalog', 'c', 'cat', 's', 'search',
])

function cleanSegment(seg) {
  let s
  try { s = decodeURIComponent(seg) } catch { s = seg }
  s = s.replace(/\.(html?|php|aspx?)$/i, '')
  const words = s.split(/[-_+\s.]+/).filter(Boolean)
  // Coduri de la sfârșit („-00263850”, „-p123456”, „-pd-dxyz”) nu fac parte din nume.
  // „a55” sau „128gb” rămân: sunt scurte.
  const isCode = (w) => /^\d{4,}$/.test(w) || /^[a-z]{1,3}\d{4,}$/i.test(w) || (/\d/.test(w) && /[a-z]/i.test(w) && w.length >= 8)
  while (words.length > 1 && isCode(words[words.length - 1])) words.pop()
  return words
}

// „emag.ro/telefon-mobil-samsung-galaxy-a55/pd/DQ1X/” → „Telefon mobil samsung galaxy a55”.
export function nameFromUrl(url) {
  let u
  try { u = new URL(url) } catch { return null }
  let best = null
  for (const seg of u.pathname.split('/')) {
    if (!seg || JUNK.has(seg.toLowerCase())) continue
    const words = cleanSegment(seg)
    const letters = words.join('').replace(/[^a-zăâîșțşţ]/gi, '').length
    // Un nume are măcar două cuvinte și mai multe litere decât cifre (nu e un cod de produs).
    if (words.length < 2 || letters < 6 || letters < words.join('').length / 2) continue
    if (!best || words.join(' ').length > best.join(' ').length) best = words
  }
  if (!best) return null
  const name = best.join(' ').toLowerCase().slice(0, 80).trim()
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Titlul trimis de alte aplicații, fără numele site-ului („Produs X - eMAG.ro” → „Produs X”).
export function cleanTitle(title) {
  const s = String(title || '').replace(/\s+[|–—-]\s+[^|–—-]{2,30}$/, '').trim()
  return s.length >= 3 && !/^https?:/i.test(s) ? s.slice(0, 120) : null
}

// „Produs necunoscut N”, cu N următorul număr liber pe listă.
export function unknownName(items) {
  const re = new RegExp(`^${t('unknownProduct', '').trim()}\\s+(\\d+)$`, 'i')
  const max = (items || []).reduce((m, i) => Math.max(m, Number(re.exec(i.name || '')?.[1] || 0)), 0)
  return t('unknownProduct', max + 1)
}

// Scurt, pentru afișare: „emag.ro”.
export const linkHost = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }
