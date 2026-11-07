// Raioanele, în ordinea în care le parcurgi de obicei prin magazin,
// plus un dicționar de cuvinte după care aplicația ghicește raionul unui produs.
//
// Cum se potrivește: numele produsului e normalizat (fără diacritice, litere mici).
// 1. Întâi se caută expresii întregi („pasta de dinti” → Drogerie, nu Băcănie).
// 2. Apoi se ia fiecare cuvânt în ordine; primul cuvânt recunoscut decide
//    („suc de roșii” → Băcănie, pentru că „suc” vine primul).
//    Un cuvânt se potrivește exact cu cheile cu „=” (ex. „=mar”) sau începe cu o rădăcină
//    („rosi” prinde „rosii”, „rosie”). Dintre rădăcini câștigă cea mai lungă.
// 3. Pluralele care schimbă ultima literă („paini” față de „paine”) se prind la final, dacă nimic
//    altceva nu s-a potrivit.
// Când corectezi raionul unui produs, aplicația ține minte alegerea ta pentru lista respectivă
// și nu mai ghicește pentru el.
// Dicționarul are cuvinte în română și în engleză (WORDS_EN), ca ghicitul să meargă în ambele limbi.
import { t } from './i18n.jsx'

// Setul implicit (de la versiunea 2.1): mai general, ca aproape nimic să nu ajungă la „Altele”.
// Cine vrea mai multe detalii își adaugă raioane din „Raioanele listei”.
export const AISLES = [
  { id: 'legume', label: 'Aprozar', icon: '🥦' },
  { id: 'panificatie', label: 'Pâine și patiserie', icon: '🥖' },
  { id: 'carne', label: 'Carne și mezeluri', icon: '🥩' },
  { id: 'lactate', label: 'Lactate și ouă', icon: '🧀' },
  { id: 'congelate', label: 'Congelate', icon: '❄️' },
  { id: 'bacanie', label: 'Băcănie și animale', icon: '🥫' },
  { id: 'vicii', label: 'Vicii', icon: '🍷' },
  { id: 'drogerie', label: 'Drogerie', icon: '🧴' },
  { id: 'farmacie', label: 'Farmacie', icon: '💊' },
  { id: 'electronice', label: 'Electronice și bricolaj', icon: '🔌' },
  { id: 'papetarie', label: 'Papetărie și rechizite', icon: '✏️' },
  { id: 'haine', label: 'Haine și încălțăminte', icon: '👕' },
  { id: 'cadouri', label: 'Cadouri și flori', icon: '🎁' },
  { id: 'altele', label: 'Altele', icon: '📦' },
]

export const DEFAULT_AISLE = 'altele'
export const aisleById = (id) => AISLES.find((a) => a.id === id) || AISLES[AISLES.length - 1]

// Raioanele setului vechi (până la 2.0) care nu mai există, și unde ajung produsele lor. Prima variantă
// e cea obișnuită; celelalte se aleg după numele produsului (berea din „Băuturi” merge la Vicii).
export const LEGACY = {
  micdejun: ['bacanie'],
  dulciuri: ['vicii'],
  bauturi: ['bacanie', 'vicii'],
  curatenie: ['drogerie', 'electronice'],
  igiena: ['drogerie'],
  animale: ['bacanie'],
}
// Invers: pe o listă rămasă cu raioanele vechi, unde ajunge ce ghicim acum într-un raion nou.
const OLD_HOME = {
  vicii: ['dulciuri', 'bauturi'],
  drogerie: ['curatenie', 'igiena'],
  electronice: ['curatenie'],
  bacanie: ['micdejun', 'bauturi', 'animale'],
}

// Numele de bază (salvate pe listă), inclusiv cele din setul vechi. Un raion implicit neredenumit se
// afișează în limba aleasă de fiecare; unul redenumit de voi rămâne cum l-ați scris.
const DEFAULT_LABEL = Object.fromEntries(AISLES.map((a) => [a.id, a.label]))
const OLD_LABELS = {
  legume: 'Legume și fructe', panificatie: 'Panificație', carne: 'Carne, pește, mezeluri', bacanie: 'Băcănie și conserve',
  micdejun: 'Cafea, ceai, mic dejun', dulciuri: 'Dulciuri și snacks', bauturi: 'Băuturi', curatenie: 'Curățenie și casă',
  igiena: 'Igienă și cosmetice', animale: 'Animale',
}
const isBaseLabel = (id, label) => DEFAULT_LABEL[id] === label || OLD_LABELS[id] === label
export const aisleLabel = (a) => (isBaseLabel(a.id, a.label) ? t(`aisle.${a.id}`) : a.label)
// La salvare, numele tradus al unui raion implicit revine la numele de bază.
export const canonicalAisleLabel = (id, label) => {
  const base = DEFAULT_LABEL[id] || OLD_LABELS[id]
  return base && label === t(`aisle.${id}`) ? base : label
}
// Lista folosește încă raioane din setul vechi.
export const hasOldAisles = (list) => Array.isArray(list?.aisles) && list.aisles.some((a) => LEGACY[a.id])

const WORDS = {
  legume: [
    'rosi', 'castrave', 'ardei', 'ceap', '=cepe', 'usturo', 'cartof', 'morcov', 'varz', 'salat', 'spanac',
    'patrunjel', 'marar', 'leustean', 'telin', 'dovle', 'vinet', 'ciuperc', 'broccoli', 'conopid',
    'praz', 'ridich', 'sfecl', 'ghimbir', 'legum', 'fruct', 'verdetur', 'rucola', 'ceapa',
    '=mar', '=mere', '=pere', '=para', 'banan', 'portocal', 'mandarin', 'lamai', '=lime',
    'grepfrut', 'strugur', 'capsun', 'cires', 'visin', 'caise', 'piersic', 'prun', 'pepen', 'kiwi',
    'avocado', 'ananas', 'mango', 'rodi', 'afin', 'zmeur', '=mure', 'smochin', 'curmal', 'nectarin',
  ],
  panificatie: [
    'paine', 'chifl', 'baghet', 'franzel', 'covrig', 'croissant', 'cornulet', 'lipi', 'toast',
    'cozonac', 'placint', 'foietaj', 'blat', 'pita', 'lavash', 'brios', 'tortill', 'merdenea', 'pateu',
  ],
  carne: [
    'carne', '=pui', 'piept', 'pulp', 'porc', 'vita', 'vitel', 'miel', 'curcan', 'tocat', 'carnat',
    'crenvurst', 'salam', 'sunc', 'parizer', 'pastram', 'bacon', 'costit', '=mici', 'peste', 'somon',
    '=ton', 'crevet', '=cod', 'macrou', 'hering', 'snitel', 'ficat', 'aripi', 'ceafa', 'muschi',
    'kaizer', 'cabanos', 'pate', 'rata', 'chorizo', 'prosciutto', 'salamuri', 'mezel', 'pastrav', 'calamar',
  ],
  lactate: [
    'lapte', 'iaurt', 'branz', 'telemea', 'cascaval', 'smantan', '=unt', 'frisc', 'chefir', 'kefir',
    'sana', 'mozzarel', 'parmezan', 'feta', 'mascarpone', 'ricotta', 'urda', '=cas', '=ou', '=oua',
    'oua', 'margarin', 'gouda', 'cheddar', 'brie', 'camembert', 'philadelphia', 'cottage', 'budinc',
  ],
  congelate: ['congel', 'inghetat', 'pizza', 'gheata', 'mazare', 'sarmale'],
  bacanie: [
    // băcănie
    'faina', 'zahar', '=sare', 'ulei', 'otet', 'orez', '=paste', 'spaghet', 'penne', 'macaroan',
    'taitei', 'malai', 'gris', 'conserv', 'fasole', 'linte', 'naut', 'bulion', 'sos', 'ketchup',
    'maionez', 'mustar', 'condiment', 'piper', 'boia', 'oregano', 'cimbru', 'scortisoar', 'vanili',
    'drojdi', 'bicarbonat', 'miere', '=gem', 'dulceat', 'masline', 'muratur', 'pesmet', 'sardin',
    'zacusc', 'humus', 'supa', 'quinoa', 'cuscus', 'bulgur', 'amidon', 'gelatin', 'sirop',
    // cafea, ceai, mic dejun
    'cafea', 'ceai', 'cereal', 'musli', 'muesli', 'ovaz', 'fulgi', 'cacao', 'capsul', 'espresso', 'nescafe',
    // băuturi fără alcool
    '=apa', 'suc', 'cola', 'pepsi', 'fanta', 'sprite', 'energizant', 'limonad', 'nectar', 'tonic',
    'socata', 'kombucha', 'redbull', 'bors', 'ayran', 'ice tea',
    // animale
    'hrana', 'pisic', 'caine', 'catel', 'whiskas', 'pedigree', 'purina', 'litiera', 'nisip pentru', 'recompense',
  ],
  vicii: [
    // dulciuri și snacks
    'ciocolat', 'biscuit', 'napolitan', 'bomboan', 'prajitur', 'tort', 'chec', 'chips', 'pufulet',
    'covrigei', 'saratel', 'popcorn', 'jeleu', 'guma', 'halva', 'rahat', 'eugenia', 'baton', 'snack',
    'nuci', 'alune', 'arahide', 'migdal', 'seminte', 'fistic', 'caju', 'stafide', 'praline', 'inghetata',
    // alcool
    'bere', '=vin', 'vinul', 'vinuri', 'tuica', 'palinc', 'whisk', 'vodc', 'cidru', 'sampani', 'prosecco',
    '=gin', '=rom', 'lichior', 'cognac', 'coniac', 'martini', 'aperol', 'jagermeister',
    // tutun
    'tigar', 'tutun', '=iqos', 'heets', 'terea', '=glo', 'neo stick', 'vape', 'brichet', 'foite',
    'marlboro', '=kent', 'davidoff', '=camel', 'winston', 'chesterfield', 'pall mall', 'lucky strike', '=lm', 'parliament',
  ],
  drogerie: [
    // curățenie
    'detergent', 'clor', 'domestos', 'inalbitor', 'buret', 'laveta', 'lavete', 'saci', 'pungi',
    'folie', 'servetel', 'odorizant', 'mop', 'galeat', 'chibrit', 'lumanar', 'solutie', 'spray',
    'perie de wc', 'lichid', 'vanish', 'calgon', 'finish', 'mr proper', 'aluminiu', 'hartie', 'scobitor',
    'filtre', 'burete', 'manusi de menaj',
    // igienă și cosmetice
    'sampon', 'balsam', 'sapun', 'periu', 'deodorant', 'crema', 'lotiun', 'absorbant', 'tampoan',
    'scutec', 'lame', 'parfum', 'demachiant', 'dischet', 'betisoar', 'gillette', 'ruj', 'rimel',
    'gel', 'ata dentara', 'dus', 'oja', 'fond de ten', 'pudra', 'vopsea de par',
  ],
  farmacie: [
    'paracetamol', 'ibuprofen', 'nurofen', 'aspirin', 'vitamin', 'plastur', 'picatur', 'unguent',
    'termometru', 'medicament', 'magneziu', 'algocalmin', 'strepsils', 'bandaj', 'spirt', 'betadin',
    'antibiotic', 'antiinflamator', 'colinspray', 'fasci', 'pastil', 'calciu', 'zinc', 'omega',
    'probiotic', 'parasinus', 'theraflu', 'coldrex', 'tantum', 'reteta', 'ser fiziologic',
  ],
  electronice: [
    '=bec', 'becuri', 'baterii', 'acumulator', 'cablu', 'incarcator', 'prelungitor', 'priza', 'adaptor',
    'casti', 'mouse', 'tastatur', 'telecomand', 'stick', 'card de memorie', 'lanterna', '=led', '=usb',
    'hdmi', 'router', 'husa', 'surub', 'cuie', 'diblu', 'bormasin', 'surubelnit', 'ciocan', 'clest',
    'vopsea', 'pensul', 'trafalet', 'silicon', 'banda izolatoare', 'chit', 'siguranta', 'intrerupator', 'unelt',
  ],
  papetarie: [
    'caiet', '=pix', '=pixuri', 'creion', 'guma de sters', 'radier', 'ascutitoar', 'rigla', 'echer', 'compas',
    'penar', 'ghiozdan', 'carioc', 'acuarel', 'tempera', 'plastilin', 'lipici', 'foarfec', 'coli', 'dosar',
    'plic', 'agend', 'marker', 'scotch', 'bloc de desen', 'coperti', 'etichet', 'post it', 'capsator',
    '=capse', 'mapa', 'biblioraft', 'perforator', 'corector', 'hartie a4', 'hartie colorata',
  ],
  haine: [
    'tricou', 'camas', 'pantalon', 'blug', 'rochi', 'fust', 'ciorap', 'sosete', 'chilot', 'boxer',
    'sutien', 'pijama', 'geaca', 'palton', 'hanorac', 'pulover', 'bluz', 'pantof', 'adidas', 'ghete',
    'cizme', 'sandal', 'papuci', 'slapi', 'caciul', 'fular', 'manusi', 'sireturi', 'curea', 'costum',
    'colanti', 'maieu', 'trening', 'vesta', 'halat', 'esarf', 'sapca', 'body',
  ],
  cadouri: [
    'flori', '=floare', 'buchet', 'trandafir', 'lalele', 'crizantem', 'orhidee', 'ghiveci', 'ghivece', 'planta',
    'plante', 'rasad', 'pamant', 'ingrasamant', 'felicitar', 'punga cadou', 'hartie de impachetat', 'funda',
    'jucari', 'lego', 'papusa', 'puzzle', 'card cadou', 'voucher', 'cadou', 'surpriza', 'baloane',
  ],
}

// Aceleași raioane, cu produse scrise în engleză. Rădăcinile sunt alese să nu prindă cuvinte românești.
const WORDS_EN = {
  legume: [
    'tomato', 'cucumber', 'onion', 'garlic', 'potato', 'carrot', 'cabbage', 'lettuce', 'spinach', 'salad',
    'parsley', '=dill', 'celery', 'courgette', 'zucchini', 'aubergine', 'eggplant', 'mushroom', 'cauliflower',
    'leek', 'radish', 'beetroot', 'ginger', 'vegetable', '=veg', '=veggies', 'fruit', '=apple', '=apples',
    '=pear', '=pears', '=plum', '=plums', 'lemon', 'orange', 'grape', 'strawberr', 'raspberr', 'blueberr',
    'blackberr', 'cherr', 'apricot', 'peach', 'melon', 'watermelon', 'pineapple', 'pomegranate', '=figs',
  ],
  panificatie: ['bread', '=bun', '=buns', 'bagel', 'baguet', '=loaf', '=loaves', 'muffin', '=wrap', '=wraps', 'brioche', '=pastry', '=pastries'],
  carne: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', '=ham', 'sausage', '=fish', 'salmon', 'tuna',
    'shrimp', 'prawn', 'steak', 'mince', 'meat', '=deli',
  ],
  lactate: ['milk', 'cheese', '=butter', 'yogurt', 'yoghurt', 'cream', '=egg', '=eggs', 'quark'],
  congelate: ['frozen', '=ice', '=peas'],
  bacanie: [
    'flour', 'sugar', '=salt', '=oil', 'vinegar', '=rice', '=pasta', 'noodle', '=beans', 'lentil', 'chickpea',
    'canned', 'sauce', 'mayo', 'mustard', 'spice', 'honey', '=jam', 'olive', 'soup', 'yeast', 'stock cube',
    'coffee', '=tea', 'teabag', 'cocoa', '=oats', 'oatmeal', 'porridge', 'granola', 'cornflakes',
    '=water', 'juice', 'soda', 'coke', 'lemonade', 'sparkling', 'cat food', 'dog food', 'litter', 'kibble', 'pet food',
  ],
  vicii: [
    'chocolate', 'cookie', 'candy', 'sweets', '=cake', 'crisps', 'pretzel', '=nuts', 'almond', 'peanut',
    'cashew', 'pistachio', 'raisin', '=gum', 'dessert',
    'beer', '=wine', 'vodk', 'whiskey', 'cider', 'champagne', '=rum', 'liqueur',
    'cigarette', 'tobacco', 'lighter', 'rolling paper',
  ],
  drogerie: [
    'bleach', 'sponge', '=foil', 'napkin', 'candle', 'cleaner', 'trash bag', 'bin bag', 'garbage bag',
    'dish soap', 'washing up', 'kitchen roll', 'paper towel', 'toilet paper', 'toilet roll', 'dishwasher',
    'laundry', 'fabric softener',
    'shampoo', 'conditioner', 'soap', 'tooth', 'lotion', 'razor', 'tampon', 'diaper', 'nappy', 'nappies', 'floss',
    'mouthwash', 'cotton', 'shower gel', 'body wash', 'wet wipes', 'makeup', 'mascara', 'lipstick',
  ],
  farmacie: ['medicine', 'painkiller', 'plaster', 'bandage', '=pill', '=pills', 'cough', 'antacid', 'allerg'],
  electronice: [
    'light bulb', '=bulb', '=bulbs', 'batteri', 'battery', 'cable', 'charger', 'adapter', 'headphone',
    'earphone', 'screw', '=nails', '=drill', 'screwdriver', 'hammer', 'extension lead', 'power strip', 'paint', 'brush',
  ],
  papetarie: [
    'notebook', '=pen', '=pens', 'pencil', 'eraser', 'rubber', 'ruler', 'sharpener', 'crayon', 'marker',
    'envelope', 'stapler', 'sticky notes', 'glue', 'scissors', 'folder', 'printer paper', 'school bag',
  ],
  haine: [
    'shirt', 'trouser', 'jeans', 'dress', 'skirt', '=sock', '=socks', 'underwear', 'pyjama', 'pajama', 'jacket',
    '=coat', 'hoodie', 'sweater', 'jumper', '=shoe', '=shoes', 'trainer', 'sneaker', '=boot', '=boots', 'sandal',
    'slipper', '=hat', 'scarf', 'glove', '=belt', 'leggings',
  ],
  cadouri: [
    'flower', 'bouquet', '=rose', '=roses', 'tulip', 'plant', 'compost', '=soil', '=gift', '=gifts',
    'wrapping paper', 'greeting card', '=toy', '=toys', 'lego', 'doll', 'balloon',
  ],
}

// Expresii care trebuie recunoscute înaintea cuvintelor individuale.
const PHRASES = {
  'pasta de dinti': 'drogerie', 'gel de dus': 'drogerie', 'lapte de corp': 'drogerie', 'apa micelara': 'drogerie',
  'apa de gura': 'drogerie', 'spuma de ras': 'drogerie', 'aparat de ras': 'drogerie', 'servetele umede': 'drogerie',
  'hartie igienica': 'drogerie', 'prosoape de hartie': 'drogerie', 'hartie de copt': 'drogerie',
  'saci de gunoi': 'drogerie', 'balsam de rufe': 'drogerie', 'balsam rufe': 'drogerie',
  'capsule de rufe': 'drogerie', 'capsule rufe': 'drogerie', 'tablete vase': 'drogerie',
  'tablete de vase': 'drogerie', 'detergent de vase': 'drogerie', 'crema de maini': 'drogerie',
  'cartofi pai': 'congelate', 'legume congelate': 'congelate',
  'praf de copt': 'bacanie', 'pasta de tomate': 'bacanie', 'unt de arahide': 'bacanie', 'foi de dafin': 'bacanie',
  'castraveti murati': 'bacanie', 'ardei copt': 'bacanie', 'lapte praf': 'bacanie', 'apa minerala': 'bacanie',
  'nisip pisici': 'bacanie', 'hrana pisici': 'bacanie', 'hrana caini': 'bacanie',
  'apa oxigenata': 'farmacie', 'sirop de tuse': 'farmacie', 'test de sarcina': 'farmacie',
  'vin fiert': 'vicii', 'bere fara alcool': 'vicii', 'filtre tigari': 'vicii', 'filtre de tigari': 'vicii',
  'seminte de flori': 'cadouri', 'pamant de flori': 'cadouri', 'hartie cadou': 'cadouri',
  'hartie de impachetat': 'cadouri', 'guma de mestecat': 'vicii', 'guma de sters': 'papetarie',
  'creioane colorate': 'papetarie', 'bloc de desen': 'papetarie',
  // engleză
  'peanut butter': 'bacanie', 'tomato paste': 'bacanie', 'tomato sauce': 'bacanie', 'baking powder': 'bacanie',
  'coconut milk': 'bacanie', 'olive oil': 'bacanie', 'bay leaves': 'bacanie', 'canned tomatoes': 'bacanie',
  'ice cream': 'congelate', 'frozen peas': 'congelate', 'fish fingers': 'congelate',
  'dishwasher tablets': 'drogerie', 'washing powder': 'drogerie', 'cream cleaner': 'drogerie',
  'baking paper': 'drogerie', 'cling film': 'drogerie',
  'hand cream': 'drogerie', 'face cream': 'drogerie', 'body lotion': 'drogerie', 'hand soap': 'drogerie',
  'cough syrup': 'farmacie', 'pregnancy test': 'farmacie', 'cat litter': 'bacanie',
  'orange juice': 'bacanie', 'apple juice': 'bacanie', 'tonic water': 'bacanie',
  'soy milk': 'lactate', 'oat milk': 'lactate', 'almond milk': 'lactate', 'sour cream': 'lactate',
  'chocolate milk': 'lactate', 'green tea': 'bacanie', 'bell pepper': 'legume', 'spring onion': 'legume',
  'sweet potato': 'legume', 'apple pie': 'vicii', 't shirt': 'haine', 'paint brush': 'electronice',
  'chewing gum': 'vicii', 'gift card': 'cadouri', 'gift bag': 'cadouri',
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
for (const [aisle, words] of [...Object.entries(WORDS), ...Object.entries(WORDS_EN)]) {
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

// Ca aisleIn, dar trece și între setul vechi și cel nou de raioane: un produs salvat în „Băuturi”
// apare la Băcănie (sau la Vicii, dacă e bere); pe o listă rămasă cu raioanele vechi, ce ghicim acum
// în „Vicii” apare la „Dulciuri și snacks” sau la „Băuturi”.
export function fitAisle(aisles, id, name = '') {
  const has = (x) => aisles.some((a) => a.id === x)
  if (OLD_HOME[id]) {
    const old = guessOld(normalize(name))
    if (old && OLD_HOME[id].includes(old) && has(old)) return old
  }
  if (has(id)) return id
  if (LEGACY[id]) {
    const guess = guessDefault(normalize(name))
    const pick = LEGACY[id].includes(guess) ? guess : LEGACY[id][0]
    if (has(pick)) return pick
  }
  return OLD_HOME[id]?.find(has) || DEFAULT_AISLE
}

// Raionul unui produs deja cunoscut pe listă (ales de mână sau ghicit atunci), potrivit raioanelor de acum.
// Dacă raionul ținut minte nu mai există, ghicim din nou.
// „Altele” nu se ține minte: se ghicește din nou.
export function knownAisle(aisles, id, name) {
  const fit = fitAisle(aisles, id, name)
  return fit !== DEFAULT_AISLE ? fit : guessAisle(name, aisles)
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
  return fitAisle(aisles, guessDefault(n), name)
}

function guessDefault(n) {
  const padded = ` ${n} `
  for (const [p, aisle] of PHRASE_LIST) if (padded.includes(` ${p}`)) return aisle
  const words = n.split(' ')
  for (const word of words) {
    if (EXACT.has(word)) return EXACT.get(word)
    if (word.length < 3) continue
    const hit = STEMS.find(([stem]) => word.startsWith(stem))
    if (hit) return hit[1]
  }
  // Pluralul care schimbă finalul („paini”, „sticle”): rădăcina începe cu cuvântul fără ultima literă.
  for (const word of words) {
    const cut = word.slice(0, -1)
    if (cut.length < 4) continue
    const hit = STEMS.find(([stem]) => stem.startsWith(cut) && stem.length <= word.length + 1)
    if (hit) return hit[1]
  }
  return DEFAULT_AISLE
}

// Pentru listele cu raioanele vechi: băuturile, mic-dejunul și hrana animalelor aveau raioanele lor.
const OLD_GROUPS = [
  ['bauturi', ['apa', 'suc', 'cola', 'pepsi', 'fanta', 'sprite', 'energizant', 'limonad', 'nectar', 'tonic', 'socata',
    'kombucha', 'redbull', 'bors', 'bere', 'vin', 'vinul', 'vinuri', 'tuica', 'palinc', 'whisk', 'vodc', 'cidru', 'sampani',
    'prosecco', 'gin', 'rom', 'lichior', 'cognac', 'coniac', 'water', 'juice', 'soda', 'coke', 'lemonade', 'beer', 'wine',
    'vodk', 'whiskey', 'cider', 'champagne', 'rum']],
  ['micdejun', ['cafea', 'ceai', 'cereal', 'musli', 'muesli', 'ovaz', 'fulgi', 'cacao', 'capsul', 'espresso', 'nescafe',
    'coffee', 'tea', 'teabag', 'cocoa', 'oats', 'oatmeal', 'porridge', 'granola', 'cornflakes']],
  ['animale', ['hrana', 'pisic', 'caine', 'catel', 'whiskas', 'pedigree', 'purina', 'litiera', 'kibble', 'litter']],
]
function guessOld(n) {
  for (const word of n.split(' ')) {
    for (const [aisle, keys] of OLD_GROUPS) {
      if (keys.some((k) => word === k || (k.length >= 4 && word.startsWith(k)))) return aisle
    }
  }
  return null
}
