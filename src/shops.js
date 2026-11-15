// Magazinele și seturile de produse ale unei liste. Amândouă stau pe documentul listei:
// `shops`: [{ id, name }] și `sets`: [{ id, name, items: [{ name, quantity }] }].
// Un produs ține minte magazinul (`shop` = id) la fel ca raionul: pe produs și în catalogul listei.
import { normalize } from './aisles.js'

export const MAX_SHOPS = 20
export const MAX_SETS = 20
export const MAX_SET_ITEMS = 40

const newId = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`
export const newShopId = () => newId('m')
export const newSetId = () => newId('s')

export const listShops = (list) => (Array.isArray(list?.shops) ? list.shops : [])
export const listSets = (list) => (Array.isArray(list?.sets) ? list.sets : [])

// Magazinul cu id-ul dat, dacă mai există pe listă (un magazin șters lasă produsele „de oriunde”).
export const shopIn = (shops, id) => (id && shops.find((s) => s.id === id)) || null

// „lapte!” = urgent. Întoarce numele fără semnul exclamării.
export function splitUrgent(name) {
  const n = String(name || '').trim()
  const urgent = /!+$/.test(n)
  return { name: urgent ? n.replace(/[\s!]+$/, '') : n, urgent }
}

// Textul unui set, așa cum îl scrii și îl vezi la modificare: un produs pe rând, cantitatea în față.
export const setText = (items) => items.map((i) => `${i.quantity ? `${i.quantity} ` : ''}${i.name}`).join('\n')

export const sameName = (a, b) => normalize(a) === normalize(b)
