// Adăugarea cu vocea și a mai multor produse deodată.
// Recunoașterea o face telefonul, gratuit, prin browser (Web Speech API): pe Android serviciul Google,
// pe iPhone dictarea Apple (nu Siri). Unde browserul nu o are, butonul nu apare; dictarea de pe
// tastatură merge oricum, iar textul cu virgule („lapte, ouă, două pâini”) se împarte tot aici.

// Recunoașterea ascultă în limba aleasă în Setări; împărțirea în produse înțelege și română, și engleză.
import { t, speechLang } from './i18n.jsx'

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const speechSupported = () => !!SR

const SILENCE_MS = 1800 // după atâta liniște considerăm că omul a terminat de spus
const NOTHING_MS = 7000 // dacă nu vine nimic în atât timp, recunoașterea nu merge (se întâmplă pe iPhone)

// Chrome pe Android, cu ascultare continuă și text parțial, trimite aceleași bucăți de mai multe ori
// („lapte lapte și carne lapte…”). Acolo ascultăm o singură frază și primim textul doar la sfârșit.
const ANDROID = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)
export const liveText = !ANDROID

// Pe iPhone textul apare pe măsură ce vorbești (onPartial); pe Android doar la sfârșit.
// La final primim tot ce s-a spus (onFinal).
export function listen({ onPartial, onFinal, onError, onEnd }) {
  const r = new SR()
  r.lang = speechLang()
  r.interimResults = liveText
  r.continuous = liveText
  r.maxAlternatives = 1
  let text = ''
  let silence
  // Pe Android textul vine abia la final, deci nu putem ști din timp că recunoașterea nu merge.
  const watchdog = liveText && setTimeout(() => { if (!text) { r.abort(); onError('no-result') } }, NOTHING_MS)
  r.onresult = (e) => {
    text = Array.from(e.results).map((x) => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim()
    onPartial(text)
    clearTimeout(silence)
    silence = setTimeout(() => r.stop(), SILENCE_MS)
  }
  r.onerror = (e) => onError(e.error)
  r.onend = () => {
    clearTimeout(watchdog); clearTimeout(silence)
    if (text) onFinal(text)
    onEnd()
  }
  r.start()
  return () => r.stop()
}

export function speechErrText(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') return t('voiceNotAllowed')
  if (code === 'no-speech') return t('voiceNoSpeech')
  if (code === 'network') return t('voiceNetwork')
  if (code === 'aborted') return null
  if (code === 'no-result') return t('voiceNoResult')
  return t('voiceFailed')
}

// ---------- Împărțirea textului în produse ----------

const NUMBERS = {
  un: 1, o: 1, una: 1, unu: 1, doi: 2, două: 2, doua: 2, trei: 3, patru: 4, cinci: 5,
  șase: 6, sase: 6, șapte: 7, sapte: 7, opt: 8, nouă: 9, noua: 9, zece: 10, jumătate: '½', jumatate: '½',
  // engleză
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: '½',
}
const ARTICLES = new Set(['un', 'o', 'una', 'a', 'an'])
// Unitățile: ID-ul (afișat prin t('unit.<id>')) și cuvintele care o numesc, în română și engleză.
const UNITS = [
  ['kg', ['kg', 'kil', 'kile', 'kilo', 'kilogram', 'kilograme', 'kilos', 'kilograms']],
  ['g', ['g', 'gram', 'grame', 'grams']],
  ['l', ['l', 'litru', 'litri', 'litrul', 'litre', 'litres', 'liter', 'liters']],
  ['buc', ['bucată', 'bucata', 'bucăți', 'bucati', 'piece', 'pieces']],
  ['pachete', ['pachet', 'pachete', 'pack', 'packs', 'packet', 'packets']],
  ['sticle', ['sticlă', 'sticla', 'sticle', 'bottle', 'bottles']],
  ['cutii', ['cutie', 'cutii', 'box', 'boxes', 'can', 'cans', 'carton', 'cartons']],
  ['borcane', ['borcan', 'borcane', 'jar', 'jars']],
]
const UNIT = new Map(UNITS.flatMap(([short, words]) => words.map((w) => [w, short])))
const FILLER = new Set(['și', 'si', 'niște', 'nişte', 'niste', 'mai', 'vreo', 'cam', 'te', 'rog', 'and', 'some', 'please', 'also'])

function parseOne(part) {
  const words = part.trim().split(/\s+/).filter(Boolean)
  while (words.length > 1 && FILLER.has(words[0].toLowerCase())) words.shift()
  let qty = ''
  const first = words[0]?.toLowerCase()
  const num = /^\d+([.,]\d+)?$/.test(first || '') ? first : NUMBERS[first]
  if (num !== undefined && words.length > 1) {
    words.shift()
    const unit = UNIT.get(words[0]?.toLowerCase())
    if (unit && words.length > 1) {
      words.shift()
      if (['de', 'of'].includes(words[0]?.toLowerCase()) && words.length > 1) words.shift()
      qty = `${num} ${t(`unit.${unit}`, num)}`
    } else if (!ARTICLES.has(first)) {
      qty = String(num)
    }
  }
  const name = words.join(' ').replace(/[.!?]+$/, '').trim()
  if (!name) return null
  return { name: name[0].toUpperCase() + name.slice(1), quantity: qty }
}

// `spoken`: la voce despărțim și după „și”, „apoi” (sau „and”, „then”); în textul scris doar după
// virgulă sau punct și virgulă.
const SPOKEN_SEP = /\s*[,;\n]\s*|\s+(?:și|si|apoi|plus|iar|and|then)\s+/i
export const hasSpokenAnd = (text) => /\s(și|si|and)\s/i.test(text)
export function parseProducts(text, { spoken = false } = {}) {
  const sep = spoken ? SPOKEN_SEP : /\s*[,;\n]\s*/
  return text.split(sep).map(parseOne).filter(Boolean)
}

