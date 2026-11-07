// Variantă fără server: totul stă în localStorage. Taburile se sincronizează între ele,
// așa că poți deschide două taburi cu utilizatori demo diferiți și vezi sincronizarea.
// Dinu e administrator; Moni, Andreea și Ștefan nu au acces până nu sunt invitați.
import { normEmail, who, newItemFields, finishTripChanges } from './shared.js'
import { productKey } from '../aisles.js'
import { t } from '../i18n.jsx'

export const DEMO_USERS = [
  { uid: 'demo-dinu', name: 'Dinu', email: 'dinu@demo.ro', photo: null },
  { uid: 'demo-moni', name: 'Moni', email: 'moni@demo.ro', photo: null },
  { uid: 'demo-andreea', name: 'Andreea', email: 'andreea@demo.ro', photo: null },
  { uid: 'demo-stefan', name: 'Ștefan', email: 'stefan@demo.ro', photo: null },
]

const DB_KEY = 'cumparaturi-demo-db-v3'
const USER_KEY = 'cumparaturi-demo-user' // sessionStorage: fiecare tab poate avea alt utilizator

const empty = () => ({ lists: {}, items: {}, products: {}, messages: {}, allowed: {}, announced: {}, secret: {}, admins: { 'dinu@demo.ro': true } })
function load() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(DB_KEY)) } } catch { return empty() }
}

const dataSubs = new Set()
const emit = () => dataSubs.forEach((f) => f())
window.addEventListener('storage', (e) => { if (e.key === DB_KEY) emit() })

function mutate(fn) {
  const db = load()
  fn(db)
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch (e) {
    onWriteError(e) // ex. prea multe poze pentru spațiul din browser
    return
  }
  emit()
}

// Trimite datele doar când s-au schimbat, ca React să nu re-randeze degeaba.
function watch(select, cb) {
  let last
  const f = () => {
    const v = select(load())
    const s = JSON.stringify(v)
    if (s !== last) { last = s; cb(v) }
  }
  dataSubs.add(f)
  f()
  return () => dataSubs.delete(f)
}

const newId = () => Math.random().toString(36).slice(2, 12)
let onWriteError = (e) => console.error(e)
export const setWriteErrorHandler = (fn) => { onWriteError = fn }

// ---------- Autentificare și acces ----------

const userSubs = new Set()
function currentUser() {
  try { return JSON.parse(sessionStorage.getItem(USER_KEY)) } catch { return null }
}
export function onUser(cb) {
  const f = () => cb(currentUser())
  userSubs.add(f)
  setTimeout(f, 0)
  return () => userSubs.delete(f)
}
export async function signIn(index = 0) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(DEMO_USERS[index]))
  userSubs.forEach((f) => f())
}
export async function signOut() {
  sessionStorage.removeItem(USER_KEY)
  userSubs.forEach((f) => f())
}

export function watchAccess(user, cb) {
  return watch((db) => {
    const admin = !!db.admins[user.email]
    return { ready: true, admin, allowed: admin || !!db.allowed[user.email] }
  }, cb)
}

// ---------- Liste ----------

export function watchLists(user, cb) {
  return watch((db) => Object.values(db.lists).filter((l) => l.memberEmails.includes(user.email)), cb)
}

export function createList(user, name, kind) {
  const id = newId()
  mutate((db) => {
    db.lists[id] = {
      id, name: name.trim(), ownerUid: user.uid, ownerEmail: user.email, memberEmails: [user.email], itemCount: 0, createdAt: Date.now(),
      ...(kind === 'gifts' ? { kind, recipients: [] } : {}),
    }
  })
  return id
}

export function renameList(listId, name) {
  mutate((db) => { db.lists[listId].name = name.trim() })
}

export async function deleteList(listId) {
  mutate((db) => {
    for (const itemId of Object.keys(db.items[listId] || {})) { delete db.messages[itemId]; delete db.messages[`s:${itemId}`] }
    delete db.lists[listId]; delete db.items[listId]; delete db.products[listId]; delete db.secret?.[listId]
  })
}

export async function loadUserPrefs(uid) {
  return JSON.parse(localStorage.getItem(`demo-userprefs-${uid}`) || 'null')
}
export function saveUserPrefs(uid, prefs) {
  localStorage.setItem(`demo-userprefs-${uid}`, JSON.stringify(prefs))
}

export const adminDeleteList = (listId) => deleteList(listId)

export function setListAisles(listId, aisles) {
  mutate((db) => { db.lists[listId].aisles = aisles })
}

export function invite(list, user, email, receives = false) {
  const e = normEmail(email)
  mutate((db) => {
    const l = db.lists[list.id]
    if (!l.memberEmails.includes(e)) l.memberEmails.push(e)
    if (receives && !l.recipients.includes(e)) l.recipients.push(e)
    db.allowed[e] = { email: e, invitedByEmail: user.email, at: Date.now() }
  })
}

export function inviteToApp(user, email) {
  const e = normEmail(email)
  mutate((db) => { db.allowed[e] = { email: e, invitedByEmail: user.email, at: Date.now() } })
}

export function removeMember(list, email) {
  const e = normEmail(email)
  mutate((db) => {
    const l = db.lists[list.id]
    l.memberEmails = l.memberEmails.filter((m) => m !== e)
    if (l.recipients) l.recipients = l.recipients.filter((m) => m !== e)
  })
}

export const leaveList = (list, user) => removeMember(list, user.email)

export function setReceives(listId, email, receives) {
  const e = normEmail(email)
  mutate((db) => {
    const l = db.lists[listId]
    l.recipients = l.recipients.filter((m) => m !== e).concat(receives ? [e] : [])
  })
}

// ---------- Produse ----------

export function watchItems(listId, cb) {
  return watch((db) => Object.values(db.items[listId] || {}).filter((i) => !i.archived), cb)
}

function upsertProduct(db, listId, name, patch, bump) {
  db.products[listId] ??= {}
  const key = productKey(name)
  const p = db.products[listId][key] ?? { id: key, count: 0 }
  db.products[listId][key] = { ...p, name, ...patch, count: p.count + (bump ? 1 : 0), ...(bump ? { lastAt: Date.now() } : {}) }
}

export function watchWishes(listId, uid, cb) {
  return watch((db) => Object.values(db.items[listId] || {}).filter((i) => i.addedBy?.uid === uid), cb)
}

export function addItem(listId, user, fields, { catalog = true } = {}) {
  const id = newId()
  mutate((db) => {
    const item = { id, ...newItemFields(user, fields), addedAt: Date.now() }
    db.items[listId] ??= {}
    db.items[listId][id] = item
    db.lists[listId].itemCount = (db.lists[listId].itemCount || 0) + 1
    if (catalog) upsertProduct(db, listId, item.name, { quantity: item.quantity, aisle: item.aisle }, true)
  })
  return id
}

export function updateItem(listId, itemId, patch) {
  mutate((db) => { Object.assign(db.items[listId][itemId], patch) })
}

export function setItemAisle(listId, item, aisle) {
  mutate((db) => {
    db.items[listId][item.id].aisle = aisle
    upsertProduct(db, listId, item.name, { aisle }, false)
  })
}

export async function deleteItem(listId, item) {
  mutate((db) => {
    delete db.items[listId][item.id]
    delete db.messages[item.id]
    delete db.messages[`s:${item.id}`]
    delete db.secret?.[listId]?.[item.id]
    if (!item.archived) db.lists[listId].itemCount = Math.max(0, (db.lists[listId].itemCount || 1) - 1)
  })
}

export function setStatus(listId, itemId, user, status, reason = null, reasonText = '') {
  const done = status !== 'pending'
  updateItem(listId, itemId, {
    status,
    reason: status === 'skipped' ? reason : null,
    reasonText: status === 'skipped' ? reasonText : '',
    resolvedBy: done ? who(user) : null,
    resolvedAt: done ? Date.now() : null,
  })
}

// ---------- Partea ascunsă a listei de cadouri ----------

export function watchSecret(listId, cb) {
  return watch((db) => Object.values(db.secret?.[listId] || {}), cb)
}

function secretOf(db, listId, itemId) {
  db.secret ??= {}
  db.secret[listId] ??= {}
  return (db.secret[listId][itemId] ??= { id: itemId })
}

export function setGiftStatus(listId, itemId, user, status) {
  mutate((db) => {
    const now = Date.now()
    Object.assign(secretOf(db, listId, itemId), {
      status,
      reservedBy: status === 'pending' ? null : who(user),
      reservedAt: status === 'pending' ? null : now,
      resolvedBy: status === 'bought' ? who(user) : null,
      resolvedAt: status === 'bought' ? now : null,
    })
  })
}

export function finishTrip(listId, items) {
  mutate((db) => {
    const changes = finishTripChanges(items)
    for (const { id, patch, archive } of changes) {
      Object.assign(db.items[listId][id], patch)
      // Pozele din discuția produselor arhivate se șterg; textul rămâne.
      if (archive) for (const m of Object.values(db.messages[id] || {})) if (m.photo) Object.assign(m, { photo: null, photoDeleted: true })
    }
    const archived = changes.filter((c) => c.archive).length
    db.lists[listId].itemCount = Math.max(0, (db.lists[listId].itemCount || 0) - archived)
  })
}

export function watchHistory(listId, cb) {
  return watch((db) => Object.values(db.items[listId] || {}).filter((i) => i.archived)
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)).slice(0, 200), cb)
}

export function watchProducts(listId, cb) {
  return watch((db) => Object.values(db.products[listId] || {}), cb)
}

// ---------- Discuția unui produs ----------

// Mesajele discuției ascunse (scope 'secret') stau sub cheia `s:<id>`; contorul lor pe partea ascunsă.
const msgKey = (itemId, scope) => (scope === 'secret' ? `s:${itemId}` : itemId)
const counterOf = (db, listId, itemId, scope) => (scope === 'secret' ? secretOf(db, listId, itemId) : db.items[listId][itemId])

export function watchMessages(listId, itemId, cb, onError, scope) {
  return watch((db) => Object.values(db.messages[msgKey(itemId, scope)] || {}).sort((a, b) => a.at - b.at), cb)
}

export function sendMessage(listId, itemId, user, { text = '', photo = null }, scope) {
  mutate((db) => {
    const id = newId()
    const at = Date.now()
    const k = msgKey(itemId, scope)
    db.messages[k] ??= {}
    db.messages[k][id] = { id, text: text.trim(), photo, by: who(user), at, reactions: {} }
    const it = counterOf(db, listId, itemId, scope)
    Object.assign(it, { msgCount: (it.msgCount || 0) + 1, lastMsgAt: at, lastMsgBy: user.uid })
  })
}

export function toggleReaction(listId, itemId, msgId, reactionId, uid, on, scope) {
  mutate((db) => {
    const m = db.messages[msgKey(itemId, scope)][msgId]
    const set = new Set(m.reactions[reactionId] || [])
    on ? set.add(uid) : set.delete(uid)
    m.reactions[reactionId] = [...set]
  })
}

export function deleteMessage(listId, itemId, msgId, scope) {
  mutate((db) => {
    delete db.messages[msgKey(itemId, scope)][msgId]
    const it = counterOf(db, listId, itemId, scope)
    it.msgCount = Math.max(0, (it.msgCount || 1) - 1)
  })
}

// ---------- Administrare ----------

export function watchAllLists(cb) {
  return watch((db) => Object.values(db.lists), cb)
}

export function watchAllowed(cb) {
  return watch((db) => Object.values(db.allowed).map((a) => ({ id: a.email, ...a })), cb)
}

export function revokeAccess(email) {
  mutate((db) => { delete db.allowed[normEmail(email)] })
}

// ---------- Ce ai anunțat deja ----------

export function watchAnnounced(uid, cb) {
  return watch((db) => db.announced?.[uid] || {}, cb)
}
export function saveAnnounced(uid, listId, state) {
  mutate((db) => { db.announced ??= {}; db.announced[uid] = { ...db.announced[uid], [listId]: state } })
}

// ---------- Notificări (în demo nu se trimite nimic) ----------

export const pushStatus = () => 'unsupported'
export async function enablePush() { throw new Error(t('pushDemo')) }
export async function disablePush() {}
export async function announce() {
  return { phones: 0, withoutPhone: [], demo: true }
}