// Iconițele aplicației: 6 desene × mai multe culori de fundal, fiecare cu inițialele D și M ascunse discret.
// Fișierul e folosit și de aplicație (alegerea din Setări), și de scripts/make-icons.mjs (PNG-urile pentru telefon).

export const INITIALS = ['D', 'M']

export const ICON_COLORS = [
  { id: 'verde', label: 'Verde', bg: '#2e7d4f' },
  { id: 'petrol', label: 'Petrol', bg: '#0f6e73' },
  { id: 'albastru', label: 'Albastru', bg: '#2b5fa6' },
  { id: 'mov', label: 'Mov', bg: '#6a4c9c' },
  { id: 'visiniu', label: 'Vișiniu', bg: '#9b2f45', heart: '#F5C26B' },
  { id: 'portocaliu', label: 'Portocaliu', bg: '#c4572b', heart: '#9b2f45' },
  { id: 'grafit', label: 'Grafit', bg: '#3b4148' },
]

const WHITE = '#ffffff'
const GOLD = '#F5C26B'
const GOLD_INK = '#7a4b00'
const FONT = 'font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle"'
const letter = (ch, x, y, size, fill, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${FONT} ${extra}>${ch}</text>`

const [A, B] = INITIALS

// Fiecare desen primește culorile și întoarce conținutul pentru un pătrat de 96×96.
export const ICON_DESIGNS = [
  {
    id: 'cos', label: 'Coș cu inimă',
    draw: (c) =>
      `<path d="M20 42h56l-6 30H26z" fill="${WHITE}"/>` +
      `<path d="M30 42l10-16M66 42L56 26" stroke="${WHITE}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M48 67c-9-6-13-10-13-15a6 6 0 0 1 13-3 6 6 0 0 1 13 3c0 5-4 9-13 15z" fill="${c.heart}"/>` +
      letter(A, 29, 62, 10, c.bg, 'opacity="0.55"') + letter(B, 67, 62, 10, c.bg, 'opacity="0.55"'),
  },
  {
    id: 'sacose', label: 'Două sacoșe',
    draw: (c) =>
      `<path d="M22 40h30l-3 34H25z" fill="${WHITE}"/>` +
      `<path d="M29 40v-6a8 8 0 0 1 16 0v6" fill="none" stroke="${WHITE}" stroke-width="4"/>` +
      `<path d="M46 46h30l-3 30H49z" fill="${GOLD}" stroke="${c.bg}" stroke-width="3"/>` +
      `<path d="M53 46v-5a8 8 0 0 1 16 0v5" fill="none" stroke="${GOLD}" stroke-width="4"/>` +
      letter(A, 36, 62, 13, c.bg) + letter(B, 61, 68, 12, GOLD_INK),
  },
  {
    id: 'lista', label: 'Listă cu două bife',
    draw: (c) =>
      `<rect x="24" y="18" width="48" height="62" rx="6" fill="${WHITE}"/>` +
      `<path d="M31 36l5 5 9-10" fill="none" stroke="${c.bg}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M31 58l5 5 9-10" fill="none" stroke="#E08A2C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
      letter(A, 59, 42, 14, '#9a9890') + letter(B, 59, 64, 14, '#9a9890'),
  },
  {
    id: 'monograma', label: 'Sacoșă cu monogramă',
    draw: (c) =>
      `<path d="M22 36h52l-4 42H26z" fill="${WHITE}"/>` +
      `<path d="M36 36v-6a12 12 0 0 1 24 0v6" fill="none" stroke="${WHITE}" stroke-width="5"/>` +
      letter(A, 44, 69, 27, c.bg) + letter(B, 59, 70, 11, c.bg, 'opacity="0.6"'),
  },
  {
    id: 'carucior', label: 'Cărucior în doi',
    draw: (c) =>
      `<path d="M16 26h10l8 34h36l6-24H30" fill="none" stroke="${WHITE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="40" cy="72" r="6" fill="${WHITE}"/><circle cx="66" cy="72" r="6" fill="${GOLD}"/>` +
      `<circle cx="45" cy="46" r="7.5" fill="${WHITE}"/><circle cx="61" cy="46" r="7.5" fill="${GOLD}"/>` +
      letter(A, 45, 49.5, 10, c.bg) + letter(B, 61, 49.5, 10, GOLD_INK),
  },
  {
    id: 'fructe', label: 'Două fructe',
    draw: (c) =>
      `<circle cx="38" cy="55" r="17" fill="${WHITE}"/><circle cx="58" cy="55" r="17" fill="${GOLD}" fill-opacity="0.94"/>` +
      `<path d="M38 38c0-6 3-10 7-12M58 38c0-6-3-10-7-12" fill="none" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M45 26c5-2 9 0 10 3-5 2-9 0-10-3z" fill="#97C459"/>` +
      letter(A, 31, 60, 13, c.bg) + letter(B, 65, 60, 13, GOLD_INK),
  },
]

export const DEFAULT_ICON = { design: 'cos', color: 'verde' }

export const findDesign = (id) => ICON_DESIGNS.find((d) => d.id === id) || ICON_DESIGNS[0]
export const findColor = (id) => ICON_COLORS.find((c) => c.id === id) || ICON_COLORS[0]

// shape: 'round' = colțuri rotunjite (în aplicație, Android „any”);
// 'full' = pătrat plin, desen micșorat (iPhone și Android „maskable”, unde telefonul taie singur forma).
export function iconSvg(designId, colorId, shape = 'round') {
  const col = findColor(colorId)
  const c = { bg: col.bg, heart: col.heart || '#E2574C' }
  const body = findDesign(designId).draw(c)
  const scale = shape === 'full' ? 0.8 : 1
  const g = scale === 1 ? body : `<g transform="translate(48 48) scale(${scale}) translate(-48 -48)">${body}</g>`
  const rx = shape === 'full' ? 0 : 22
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="${rx}" fill="${col.bg}"/>${g}</svg>`
}

export const iconDataUrl = (design, color) => `data:image/svg+xml,${encodeURIComponent(iconSvg(design, color))}`
export const iconKey = (design, color) => `${findDesign(design).id}-${findColor(color).id}`

// ---------- Manifestul aplicației (același pentru toate combinațiile, diferă doar iconițele) ----------

export const APP = {
  id: '/',
  name: 'DuoShopping',
  short_name: 'DuoShopping',
  description: 'Lista de cumpărături comună, sincronizată între telefoane.',
  lang: 'ro',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#f5f6f2',
  theme_color: '#2e7d4f',
  // Android: aplicația instalată apare în meniul „Share” al altor aplicații (vezi src/ShareIn.jsx).
  share_target: {
    action: '/',
    method: 'GET',
    params: { title: 'shared_title', text: 'shared_text', url: 'shared_url' },
  },
}

export function manifestIcons(key) {
  return [
    { src: `/icons/${key}-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `/icons/${key}-512.png`, sizes: '512x512', type: 'image/png' },
    { src: `/icons/${key}-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]
}
