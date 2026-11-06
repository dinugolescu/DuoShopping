// Adăugarea cu vocea și a mai multor produse deodată.
// Recunoașterea o face telefonul, gratuit, prin browser (Web Speech API): pe Android serviciul Google,
// pe iPhone dictarea Apple (nu Siri). Unde browserul nu o are, butonul nu apare; dictarea de pe
// tastatură merge oricum, iar textul cu virgule („lapte, ouă, două pâini”) se împarte tot aici.

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
export const speechSupported = () => !!SR

export function listen({ onText, onError, onEnd }) {
  const r = new SR()
  r.lang = 'ro-RO'
  r.interimResults = false
  r.continuous = false
  r.maxAlternatives = 1
  r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
  r.onerror = (e) => onError(e.error)
  r.onend = onEnd
  r.start()
  return () => r.abort()
}

export function speechErrText(code) {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Microfonul nu e permis aici. Poți folosi microfonul de pe tastatură, cu produsele despărțite prin virgulă.'
  }
  if (code === 'no-speech') return 'N-am auzit nimic. Mai încearcă.'
  if (code === 'network') return 'Recunoașterea vorbirii are nevoie de internet.'
  if (code === 'aborted') return null
  return 'Nu am putut asculta. Mai încearcă sau scrie produsele.'
}

// ---------- Împărțirea textului în produse ----------

const NUMBERS = {
  un: 1, o: 1, una: 1, unu: 1, doi: 2, două: 2, doua: 2, trei: 3, patru: 4, cinci: 5,
  șase: 6, sase: 6, șapte: 7, sapte: 7, opt: 8, nouă: 9, noua: 9, zece: 10, jumătate: '½', jumatate: '½',
}
const ARTICLES = new Set(['un', 'o', 'una'])
const UNITS = [
  ['kg', ['kg', 'kil', 'kile', 'kilo', 'kilogram', 'kilograme']],
  ['g', ['g', 'gram', 'grame']],
  ['l', ['l', 'litru', 'litri', 'litrul']],
  ['buc', ['bucată', 'bucata', 'bucăți', 'bucati']],
  ['pachete', ['pachet', 'pachete']],
  ['sticle', ['sticlă', 'sticla', 'sticle']],
  ['cutii', ['cutie', 'cutii']],
  ['borcane', ['borcan', 'borcane']],
]
const UNIT = new Map(UNITS.flatMap(([short, words]) => words.map((w) => [w, short])))
const FILLER = new Set(['și', 'si', 'niște', 'nişte', 'niste', 'mai', 'vreo', 'cam', 'te', 'rog'])

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
      if (words[0]?.toLowerCase() === 'de' && words.length > 1) words.shift()
      qty = `${num} ${unit === 'buc' && num === 1 ? 'buc' : unit}`
    } else if (!ARTICLES.has(first)) {
      qty = String(num)
    }
  }
  const name = words.join(' ').replace(/[.!?]+$/, '').trim()
  if (!name) return null
  return { name: name[0].toUpperCase() + name.slice(1), quantity: qty }
}

// `spoken`: la voce despărțim și după „și”, „apoi”; în textul scris doar după virgulă sau punct și virgulă.
export function parseProducts(text, { spoken = false } = {}) {
  const sep = spoken ? /\s*[,;\n]\s*|\s+(?:și|si|apoi|plus|iar)\s+/i : /\s*[,;\n]\s*/
  return text.split(sep).map(parseOne).filter(Boolean)
}
