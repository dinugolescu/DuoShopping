// Raioanele, în ordinea în care le parcurgi de obicei prin magazin,
// plus un dicționar de cuvinte după care aplicația ghicește raionul unui produs.
//
// Cum se potrivește: numele produsului e normalizat (fără diacritice, litere mici).
// 1. Întâi se caută expresii întregi („pasta de dinti” → Igienă, nu Băcănie).
// 2. Apoi se ia fiecare cuvânt în ordine; primul cuvânt recunoscut decide
//    („suc de roșii” → Băuturi, pentru că „suc” vine primul).
//    Un cuvânt se potrivește exact cu cheile cu „=” (ex. „=mar”) sau începe cu o rădăcină
//    („rosi” prinde „rosii”, „rosie”). Dintre rădăcini câștigă cea mai lungă.
// Când corectezi raionul unui produs, aplicația ține minte alegerea ta pentru lista respectivă
// și nu mai ghicește pentru el.

export const AISLES = [
  { id: 'legume', label: 'Legume și fructe', icon: '🥦' },
  { id: 'panificatie', label: 'Panificație', icon: '🥖' },
  { id: 'lactate', label: 'Lactate și ouă', icon: '🧀' },
  { id: 'carne', label: 'Carne, pește, mezeluri', icon: '🥩' },
  { id: 'congelate', label: 'Congelate', icon: '❄️' },
  { id: 'bacanie', label: 'Băcănie și conserve', icon: '🥫' },
  { id: 'micdejun', label: 'Cafea, ceai, mic dejun', icon: '☕' },
  { id: 'dulciuri', label: 'Dulciuri și snacks', icon: '🍫' },
  { id: 'bauturi', label: 'Băuturi', icon: '🥤' },
  { id: 'curatenie', label: 'Curățenie și casă', icon: '🧽' },
  { id: 'igiena', label: 'Igienă și cosmetice', icon: '🧴' },
  { id: 'farmacie', label: 'Farmacie', icon: '💊' },
  { id: 'animale', label: 'Animale', icon: '🐾' },
  { id: 'altele', label: 'Altele', icon: '📦' },
]

export const DEFAULT_AISLE = 'altele'
export const aisleById = (id) => AISLES.find((a) => a.id === id) || AISLES[AISLES.length - 1]

const WORDS = {
  legume: [
    'rosi', 'castrave', 'ardei', 'ceap', 'usturo', 'cartof', 'morcov', 'varz', 'salat', 'spanac',
    'patrunjel', 'marar', 'leustean', 'telin', 'dovle', 'vinet', 'ciuperc', 'broccoli', 'conopid',
    'praz', 'ridich', 'sfecl', 'ghimbir', 'legum', 'fruct', 'verdetur', 'rucola', 'ceapa',
    '=mar', '=mere', '=mar', '=pere', '=para', 'banan', 'portocal', 'mandarin', 'lamai', '=lime',
    'grepfrut', 'strugur', 'capsun', 'cires', 'visin', 'caise', 'piersic', 'prun', 'pepen', 'kiwi',
    'avocado', 'ananas', 'mango', 'rodi', 'afin', 'zmeur', 'mur', 'smochin', 'curmal', 'nectarin',
  ],
  panificatie: [
    'paine', 'chifl', 'baghet', 'franzel', 'covrig', 'croissant', 'cornulet', 'lipi', 'toast',
    'cozonac', 'placint', 'foietaj', 'blat', 'pita', 'lavash', 'brios', 'tortill',
  ],
  lactate: [
    'lapte', 'iaurt', 'branz', 'telemea', 'cascaval', 'smantan', '=unt', 'frisc', 'chefir', 'kefir',
    'sana', 'mozzarel', 'parmezan', 'feta', 'mascarpone', 'ricotta', 'urda', '=cas', '=ou', '=oua',
    'oua', 'margarin', 'gouda', 'cheddar', 'brie', 'camembert', 'philadelphia', 'cottage',
  ],
  carne: [
    'carne', '=pui', 'piept', 'pulp', 'porc', 'vita', 'vitel', 'miel', 'curcan', 'tocat', 'carnat',
    'crenvurst', 'salam', 'sunc', 'parizer', 'pastram', 'bacon', 'costit', '=mici', 'peste', 'somon',
    '=ton', 'crevet', '=cod', 'macrou', 'hering', 'snitel', 'ficat', 'aripi', 'ceafa', 'muschi',
    'kaizer', 'cabanos', 'pate', 'rata', 'chorizo', 'prosciutto', 'salamuri', 'mezel', 'cârnați',
  ],
  congelate: ['congel', 'inghetat', 'pizza', 'gheata', 'mazare', 'sarmale'],
  bacanie: [
    'faina', 'zahar', '=sare', 'ulei', 'otet', 'orez', '=paste', 'spaghet', 'penne', 'macaroan',
    'taitei', 'malai', 'gris', 'conserv', 'fasole', 'linte', 'naut', 'bulion', 'sos', 'ketchup',
    'maionez', 'mustar', 'condiment', 'piper', 'boia', 'oregano', 'cimbru', 'scortisoar', 'vanili',
    'drojdi', 'bicarbonat', 'miere', '=gem', 'dulceat', 'masline', 'muratur', 'pesmet', 'sardin',
    'zacusc', 'humus', 'supa', 'quinoa', 'cuscus', 'bulgur', 'amidon', 'gelatin', 'sirop de artar',
  ],
  micdejun: ['cafea', 'ceai', 'cereal', 'musli', 'muesli', 'ovaz', 'fulgi', 'cacao', 'capsul', 'espresso', 'nescafe'],
  dulciuri: [
    'ciocolat', 'biscuit', 'napolitan', 'bomboan', 'prajitur', 'tort', 'chec', 'chips', 'pufulet',
    'covrigei', 'saratel', 'popcorn', 'jeleu', 'guma', 'halva', 'rahat', 'eugenia', 'baton', 'snack',
    'nuci', 'alune', 'arahide', 'migdal', 'seminte', 'fistic', 'caju', 'stafide', 'praline',
  ],
  bauturi: [
    '=apa', 'suc', 'bere', '=vin', 'vinul', 'tuica', 'palinc', 'whisk', 'vodc', 'cola', 'pepsi',
    'fanta', 'sprite', 'energizant', 'limonad', 'nectar', 'cidru', 'sampani', 'prosecco', 'tonic',
    'gin', 'rom', 'lichior', 'cognac', 'coniac', 'socata', 'kombucha', 'redbull', 'bors',
  ],
  curatenie: [
    'detergent', 'clor', 'domestos', 'inalbitor', 'buret', 'laveta', 'lavete', 'saci', 'pungi',
    'folie', 'servetel', 'odorizant', 'mop', 'galeat', 'bec', 'baterii', 'chibrit', 'lumanar',
    'solutie', 'spray', 'perie de wc', 'lichid', 'vanish', 'calgon', 'finish', 'mr proper',
    'aluminiu', 'hartie', 'scobitor', 'filtre',
  ],
  igiena: [
    'sampon', 'balsam', 'sapun', 'periu', 'deodorant', 'crema', 'lotiun', 'absorbant', 'tampoan',
    'scutec', 'lame', 'parfum', 'demachiant', 'dischet', 'betisoar', 'gillette', 'ruj', 'rimel',
    'gel', 'ata dentara', 'dus',
  ],
  farmacie: [
    'paracetamol', 'ibuprofen', 'nurofen', 'aspirin', 'vitamin', 'plastur', 'picatur', 'unguent',
    'termometru', 'medicament', 'magneziu', 'algocalmin', 'strepsils', 'bandaj', 'spirt', 'betadin',
    'antibiotic', 'antiinflamator', 'colinspray', 'fasci', 'pastil', 'calciu', 'zinc', 'omega',
    'probiotic', 'nurofen', 'parasinus', 'theraflu', 'coldrex', 'tantum',
  ],
  animale: ['hrana', 'pisic', 'caine', 'catel', 'whiskas', 'pedigree', 'purina', 'litiera', 'nisip pentru'],
}

// Expresii care trebuie recunoscute înaintea cuvintelor individuale.
const PHRASES = {
  'pasta de dinti': 'igiena', 'gel de dus': 'igiena', 'lapte de corp': 'igiena', 'apa micelara': 'igiena',
  'apa de gura': 'igiena', 'spuma de ras': 'igiena', 'aparat de ras': 'igiena', 'servetele umede': 'igiena',
  'hartie igienica': 'curatenie', 'prosoape de hartie': 'curatenie', 'hartie de copt': 'curatenie',
  'saci de gunoi': 'curatenie', 'balsam de rufe': 'curatenie', 'balsam rufe': 'curatenie',
  'capsule de rufe': 'curatenie', 'capsule rufe': 'curatenie', 'tablete vase': 'curatenie',
  'tablete de vase': 'curatenie', 'detergent de vase': 'curatenie',
  'cartofi pai': 'congelate', 'legume congelate': 'congelate',
  'praf de copt': 'bacanie', 'pasta de tomate': 'bacanie', 'unt de arahide': 'bacanie', 'foi de dafin': 'bacanie',
  'apa oxigenata': 'farmacie', 'sirop de tuse': 'farmacie', 'test de sarcina': 'farmacie',
  'castraveti murati': 'bacanie', 'ardei copt': 'bacanie', 'lapte praf': 'bacanie',
  'nisip pisici': 'animale', 'hrana pisici': 'animale', 'hrana caini': 'animale',
}

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Cheie stabilă pentru catalogul de produse (folosită ca ID de document).
export const productKey = (name) => normalize(name).replace(/ /g, '-').slice(0, 100) || 'produs'

const EXACT = new Map()
const STEMS = []
for (const [aisle, words] of Object.entries(WORDS)) {
  for (const w of words) {
    const n = normalize(w.replace(/^=/, ''))
    if (w.startsWith('=')) EXACT.set(n, aisle)
    else if (n.includes(' ')) PHRASES[n] ??= aisle
    else STEMS.push([n, aisle])
  }
}
STEMS.sort((a, b) => b[0].length - a[0].length)
const PHRASE_LIST = Object.entries(PHRASES).sort((a, b) => b[0].length - a[0].length)

// Raioanele unei liste: cele salvate pe listă (editate de voi) sau cele implicite.
// „Altele” există mereu, la final, ca să aibă unde ajunge produsele fără raion.
export function listAisles(list) {
  const own = Array.isArray(list?.aisles) && list.aisles.length ? list.aisles : AISLES
  return own.some((a) => a.id === DEFAULT_AISLE) ? own : [...own, AISLES[AISLES.length - 1]]
}

// Raionul în care apare un produs: cel ales/ghicit, dacă mai există în listă; altfel „Altele”.
export function aisleIn(aisles, id) {
  return aisles.some((a) => a.id === id) ? id : DEFAULT_AISLE
}

// Ghicitul ține cont de raioanele listei: întâi cuvintele-cheie ale raioanelor voastre,
// apoi dicționarul de mai sus (dacă raionul ghicit a fost șters, produsul ajunge la „Altele”).
export function guessAisle(name, aisles = AISLES) {
  const n = normalize(name)
  if (!n) return DEFAULT_AISLE
  for (const a of aisles) {
    for (const k of a.keywords || []) {
      const kw = normalize(k)
      if (kw && (` ${n} `.includes(` ${kw} `) || (kw.length >= 3 && n.split(' ').some((w) => w.startsWith(kw))))) return a.id
    }
  }
  return aisleIn(aisles, guessDefault(n))
}

function guessDefault(n) {
  const padded = ` ${n} `
  for (const [p, aisle] of PHRASE_LIST) if (padded.includes(` ${p}`)) return aisle
  for (const word of n.split(' ')) {
    if (EXACT.has(word)) return EXACT.get(word)
    if (word.length < 3) continue
    const hit = STEMS.find(([stem]) => word.startsWith(stem))
    if (hit) return hit[1]
  }
  return DEFAULT_AISLE
}
