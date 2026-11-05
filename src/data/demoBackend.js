// Variantă fără server: totul stă în localStorage. Taburile se sincronizează între ele,
// așa că poți deschide două taburi cu utilizatori demo diferiți și vezi sincronizarea.
// Dinu e administrator; Ana și Mihai nu au acces până nu sunt invitați.
import { normEmail, who, newItemFields, finishTripChanges } from './shared.js'
import { productKey } from '../aisles.js'

export const DEMO_USERS = [
  { uid: 'demo-dinu', name: 'Dinu Demo', email: 'dinu@demo.ro', photo: null },
  { uid: 'demo-ana', name: 'Ana Demo', email: 'ana@demo.ro', photo: null },
  { uid: 'demo-mihai', name: 'Mihai Demo', email: 'mihai@demo.ro', photo: null },
]

const DB_KEY = 'cumparaturi-demo-db-v2'
const USER_KEY = 'cumparaturi-demo-user' // sessionStorage: fiecare tab poate avea alt utilizator

const empty = () => ({ lists: {}, items: {}, products: {}, messages: {}, allowed: {}, admins: { 'dinu@demo.ro': true } })
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

export function createList(user, name) {
  const id = newId()
  mutate((db) => {
    db.lists[id] = { id, name: name.trim(), ownerUid: user.uid, ownerEmail: user.email, memberEmails: [user.email], itemCount: 0, createdAt: Date.now() }
  })
  return id
}

export function renameList(listId, name) {
  mutate((db) => { db.lists[listId].name = name.trim() })
}

export async function deleteList(listId) {
  mutate((db) => {
    for (const itemId of Object.keys(db.items[listId] || {})) delete db.messages[itemId]
    delete db.lists[listId]; delete db.items[listId]; delete db.products[listId]
  })
}

export function invite(list, user, email) {
  const e = normEmail(email)
  mutate((db) => {
    const l = db.lists[list.id]
    if (!l.memberEmails.includes(e)) l.memberEmails.push(e)
    db.allowed[e] = { email: e, invitedByEmail: user.email, at: Date.now() }
  })
}

export function removeMember(listId, email) {
  const e = normEmail(email)
  mutate((db) => {
    const l = db.lists[listId]
    l.memberEmails = l.memberEmails.filter((m) => m !== e)
  })
}

export const leaveList = (listId, user) => removeMember(listId, user.email)

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

export function addItem(listId, user, fields) {
  const id = newId()
  mutate((db) => {
    const item = { id, ...newItemFields(user, fields), addedAt: Date.now() }
    db.items[listId] ??= {}
    db.items[listId][id] = item
    db.lists[listId].itemCount = (db.lists[listId].itemCount || 0) + 1
    upsertProduct(db, listId, item.name, { quantity: item.quantity, aisle: item.aisle }, true)
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

export function finishTrip(listId, items) {
  mutate((db) => {
    const changes = finishTripChanges(items)
    for (const { id, patch } of changes) Object.assign(db.items[listId][id], patch)
    const archived = changes.filter((c) => c.archive).length
    db.lists[listId].itemCount = Math.max(0, (db.lists[listId].itemCount || 0) - archived)
  })
}

export function watchProducts(listId, cb) {
  return watch((db) => Object.values(db.products[listId] || {}), cb)
}

// ---------- Discuția unui produs ----------

export function watchMessages(listId, itemId, cb) {
  return watch((db) => Object.values(db.messages[itemId] || {}).sort((a, b) => a.at - b.at), cb)
}

export function sendMessage(listId, itemId, user, { text = '', photo = null }) {
  mutate((db) => {
    const id = newId()
    const at = Date.now()
    db.messages[itemId] ??= {}
    db.messages[itemId][id] = { id, text: text.trim(), photo, by: who(user), at, reactions: {} }
    const it = db.items[listId][itemId]
    Object.assign(it, { msgCount: (it.msgCount || 0) + 1, lastMsgAt: at, lastMsgBy: user.uid })
  })
}

export function toggleReaction(listId, itemId, msgId, reactionId, uid, on) {
  mutate((db) => {
    const m = db.messages[itemId][msgId]
    const set = new Set(m.reactions[reactionId] || [])
    on ? set.add(uid) : set.delete(uid)
    m.reactions[reactionId] = [...set]
  })
}

export function deleteMessage(listId, itemId, msgId) {
  mutate((db) => {
    delete db.messages[itemId][msgId]
    const it = db.items[listId][itemId]
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
