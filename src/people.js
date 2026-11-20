// Oamenii dintr-o listă după nume scurte: poreclele alese de tine („@Moni”) în loc de adrese.
// Porecla stă în setările din cont (`aliases`: adresă -> poreclă), deci o ai pe toate listele și pe toate telefoanele.
import { getPref } from './prefs.js'

export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Fără poreclă: prima parte din adresă („moni.pop@…” -> „Moni”).
export function defaultName(email) {
  const w = String(email || '').split('@')[0].split(/[._-]/)[0]
  return w ? w[0].toUpperCase() + w.slice(1) : String(email || '')
}

// Poreclele nu au spații și nici @ (altfel nu s-ar putea scrie ca @Moni).
export const cleanAlias = (s) => String(s || '').replace(/[\s@]/g, '').slice(0, 20)

export const personName = (email, aliases = getPref('aliases')) => aliases?.[email] || defaultName(email)

const TAG = /@([\p{L}\p{N}_]+)/gu

// Adresele chemate cu @ într-un text, dintre `members` (fără cel care scrie). Se potrivește pe poreclă,
// pe numele din adresă sau pe adresa întreagă dinaintea lui @, fără diacritice și fără litere mari.
export function mentionedEmails(text, members, self, aliases = getPref('aliases')) {
  const tags = new Set([...String(text || '').matchAll(TAG)].map((m) => fold(m[1])))
  if (!tags.size) return []
  return members.filter((e) => e !== self && [aliases?.[e], defaultName(e), String(e).split('@')[0]].some((n) => n && tags.has(fold(n))))
}

// Textul cu @nume-urile separate, ca să se vadă în mesaj: [{ text, tag }].
export function splitMentions(text) {
  return String(text || '').split(/(@[\p{L}\p{N}_]+)/u).filter(Boolean).map((p) => ({ text: p, tag: p.startsWith('@') && p.length > 1 }))
}

// Ce se scrie acum după un @ (pentru propuneri), sau null.
export const partialMention = (text) => String(text || '').match(/@([\p{L}\p{N}_]*)$/u)?.[1] ?? null
