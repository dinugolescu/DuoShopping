// Micșorează o poză pe telefon înainte de trimitere: latura maximă 1200 px, JPEG.
// Rezultatul (≈100–250 KB) se salvează direct în baza de date, ca text base64.
import { t } from './i18n.jsx'

const MAX_SIDE = 1200
const MAX_CHARS = 850_000 // documentele Firestore au maxim 1 MB

export async function compressImage(file) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

  // Dacă tot e prea mare, scădem calitatea treptat.
  for (const q of [0.72, 0.6, 0.45, 0.3]) {
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length <= MAX_CHARS) return url
  }
  throw new Error(t('photoTooBig'))
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('notAPhoto'))) }
    img.src = url
  })
}
