// Generează iconițele PNG și câte un manifest pentru fiecare combinație desen × culoare (vezi src/appIcons.js).
// Rulează cu `npm run icons` după ce schimbi ceva la iconițe; fișierele generate se pun în git.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import { ICON_DESIGNS, ICON_COLORS, DEFAULT_ICON, APP, iconSvg, iconKey, manifestIcons } from '../src/appIcons.js'

const png = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } })
    .render().asPng()

rmSync('public/icons', { recursive: true, force: true })
rmSync('public/manifests', { recursive: true, force: true })
mkdirSync('public/icons', { recursive: true })
mkdirSync('public/manifests', { recursive: true })

for (const d of ICON_DESIGNS) {
  for (const c of ICON_COLORS) {
    const key = iconKey(d.id, c.id)
    const round = iconSvg(d.id, c.id, 'round')
    const full = iconSvg(d.id, c.id, 'full')
    writeFileSync(`public/icons/${key}-192.png`, png(round, 192))
    writeFileSync(`public/icons/${key}-512.png`, png(round, 512))
    writeFileSync(`public/icons/${key}-maskable.png`, png(full, 512))
    writeFileSync(`public/icons/${key}-apple.png`, png(full, 180))
    writeFileSync(`public/manifests/${key}.webmanifest`, JSON.stringify({ ...APP, icons: manifestIcons(key) }, null, 2) + '\n')
  }
}

// Iconița implicită, la adresele vechi (folosite de pagina de login, favicon și instalările existente).
const { design, color } = DEFAULT_ICON
writeFileSync('public/icon.svg', iconSvg(design, color, 'round') + '\n')
writeFileSync('public/icon-192.png', png(iconSvg(design, color, 'round'), 192))
writeFileSync('public/icon-512.png', png(iconSvg(design, color, 'round'), 512))
writeFileSync('public/apple-touch-icon.png', png(iconSvg(design, color, 'full'), 180))

console.log(`Iconițe generate: ${ICON_DESIGNS.length} desene × ${ICON_COLORS.length} culori`)
