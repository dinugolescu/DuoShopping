import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, where, orderBy, limit,
  serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch, FieldPath,
} from 'firebase/firestore'
import { normEmail, who, newItemFields, finishTripChanges } from './shared.js'
import { productKey } from '../aisles.js'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
})
const auth = getAuth(app)
// Cache local persistent: lista merge și fără semnal, scrierile se trimit când revine rețeaua.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Atenție: cu Firestore offline, promisiunile de scriere se rezolvă abia când serverul confirmă.
// De aceea nu le așteptăm (await) în interfață, doar raportăm erorile.
let onWriteError = (e) => console.error(e)
const fire = (p) => { p.catch((e) => onWriteError(e)) }
export const setWriteErrorHandler = (fn) => { onWriteError = fn }

// ---------- Autentificare și acces ----------

const toUser = (u) => u && { uid: u.uid, name: u.displayName || u.email, email: normEmail(u.email), photo: u.photoURL }

export function onUser(cb) {
  return onAuthStateChanged(auth, (u) => cb(toUser(u)))
}

// Finalizează un login început prin redirect (ex. din aplicația instalată pe iPhone).
getRedirectResult(auth).catch((e) => console.error('Redirect login:', e))

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export async function signIn() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  // În aplicația instalată (mai ales pe iOS) popup-urile nu funcționează, deci folosim redirect.
  if (isStandalone()) return signInWithRedirect(auth, provider)
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    if (e.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider)
    throw e
  }
}

export async function signOut() {
  // Telefonul nu mai primește notificări pentru contul din care ai ieșit.
  await disablePush().catch((e) => console.error(e))
  return fbSignOut(auth)
}

// cb({ ready, allowed, admin }). Un document lipsă citit doar din cache (offline, prima dată)
// nu e considerat răspuns final, ca să nu afișăm greșit „nu ai acces”.
export function watchAccess(user, cb) {
  const state = { admin: null, allowed: null }
  const emit = () => {
    if (state.admin === null || state.allowed === null) return
    cb({ ready: true, admin: state.admin, allowed: state.allowed || state.admin })
  }
  const watchFlag = (path, key) => onSnapshot(
    doc(db, path, user.email),
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists() && snap.metadata.fromCache) return
      state[key] = snap.exists()
      emit()
    },
    (e) => { console.error(e); state[key] = false; emit() },
  )
  const u1 = watchFlag('admins', 'admin')
  const u2 = watchFlag('allowed', 'allowed')
  return () => { u1(); u2() }
}

// ---------- Conversii și referințe ----------

const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : t ?? null)
function fromDoc(d) {
  const data = d.data({ serverTimestamps: 'estimate' })
  for (const k of ['createdAt', 'addedAt', 'resolvedAt', 'lastMsgAt', 'lastAt', 'at']) if (k in data) data[k] = ms(data[k])
  return { id: d.id, ...data }
}
const mapSnap = (cb) => (snap) => cb(snap.docs.map(fromDoc))

const listsCol = collection(db, 'lists')
const listDoc = (id) => doc(db, 'lists', id)
const itemsCol = (listId) => collection(db, 'lists', listId, 'items')
const itemDoc = (listId, id) => doc(db, 'lists', listId, 'items', id)
const msgsCol = (listId, itemId) => collection(db, 'lists', listId, 'items', itemId, 'messages')
const productsCol = (listId) => collection(db, 'lists', listId, 'products')

// Batch-urile Firestore au maxim 500 de operații; le împărțim la nevoie.
async function deleteRefs(refs) {
  for (let i = 0; i < refs.length; i += 450) {
    const b = writeBatch(db)
    refs.slice(i, i + 450).forEach((r) => b.delete(r))
    await b.commit()
  }
}

// ---------- Liste ----------

export function watchLists(user, cb, onError) {
  const q = query(listsCol, where('memberEmails', 'array-contains', user.email))
  return onSnapshot(q, mapSnap(cb), (e) => onError?.(e))
}

export function createList(user, name) {
  const ref = doc(listsCol)
  fire(setDoc(ref, {
    name: name.trim(),
    ownerUid: user.uid,
    ownerEmail: user.email,
    memberEmails: [user.email],
    itemCount: 0,
    createdAt: serverTimestamp(),
  }))
  return ref.id
}

export function renameList(listId, name) {
  fire(updateDoc(listDoc(listId), { name: name.trim() }))
}

export function setListAisles(listId, aisles) {
  fire(updateDoc(listDoc(listId), { aisles }))
}

export async function deleteList(listId) {
  const items = await getDocs(itemsCol(listId))
  const refs = []
  for (const it of items.docs) {
    const msgs = await getDocs(msgsCol(listId, it.id))
    refs.push(...msgs.docs.map((m) => m.ref), it.ref)
  }
  const products = await getDocs(productsCol(listId))
  refs.push(...products.docs.map((p) => p.ref), listDoc(listId))
  fire(deleteRefs(refs))
}

// Invitația pune adresa în listă și îi dă acces în aplicație.
export function invite(list, user, email) {
  const e = normEmail(email)
  const b = writeBatch(db)
  b.update(listDoc(list.id), { memberEmails: arrayUnion(e) })
  b.set(doc(db, 'allowed', e), { email: e, invitedByEmail: user.email, at: serverTimestamp() })
  fire(b.commit())
}

export function removeMember(listId, email) {
  fire(updateDoc(listDoc(listId), { memberEmails: arrayRemove(normEmail(email)) }))
}

export function leaveList(listId, user) {
  fire(updateDoc(listDoc(listId), { memberEmails: arrayRemove(user.email) }))
}

// ---------- Produse ----------

export function watchItems(listId, cb, onError) {
  // Fără orderBy în query: sortăm în aplicație, ca să nu fie nevoie de index compus.
  const q = query(itemsCol(listId), where('archived', '==', false))
  return onSnapshot(q, mapSnap(cb), (e) => onError?.(e))
}

export function addItem(listId, user, fields) {
  const ref = doc(itemsCol(listId))
  const item = newItemFields(user, fields)
  const b = writeBatch(db)
  b.set(ref, { ...item, addedAt: serverTimestamp() })
  b.update(listDoc(listId), { itemCount: increment(1) })
  // Catalogul listei: de aici vin sugestiile și raionul ținut minte.
  b.set(doc(productsCol(listId), productKey(item.name)), {
    name: item.name, quantity: item.quantity, aisle: item.aisle, count: increment(1), lastAt: serverTimestamp(),
  }, { merge: true })
  fire(b.commit())
  return ref.id
}

export function updateItem(listId, itemId, patch) {
  fire(updateDoc(itemDoc(listId, itemId), patch))
}

export function setItemAisle(listId, item, aisle) {
  const b = writeBatch(db)
  b.update(itemDoc(listId, item.id), { aisle })
  b.set(doc(productsCol(listId), productKey(item.name)), { name: item.name, aisle }, { merge: true })
  fire(b.commit())
}

export async function deleteItem(listId, item) {
  const msgs = await getDocs(msgsCol(listId, item.id))
  const b = writeBatch(db)
  msgs.docs.forEach((m) => b.delete(m.ref))
  b.delete(itemDoc(listId, item.id))
  if (!item.archived) b.update(listDoc(listId), { itemCount: increment(-1) })
  fire(b.commit())
}

export function setStatus(listId, itemId, user, status, reason = null, reasonText = '') {
  const done = status !== 'pending'
  fire(updateDoc(itemDoc(listId, itemId), {
    status,
    reason: status === 'skipped' ? reason : null,
    reasonText: status === 'skipped' ? reasonText : '',
    resolvedBy: done ? who(user) : null,
    resolvedAt: done ? serverTimestamp() : null,
  }))
}

export function finishTrip(listId, items) {
  const changes = finishTripChanges(items)
  const b = writeBatch(db)
  for (const { id, patch } of changes) b.update(itemDoc(listId, id), patch)
  const archived = changes.filter((c) => c.archive).length
  if (archived) b.update(listDoc(listId), { itemCount: increment(-archived) })
  fire(b.commit())
  // Pozele din discuția produselor arhivate se șterg (ocupă cel mai mult); textul mesajelor rămâne.
  const withChat = items.filter((i) => i.msgCount > 0 && changes.some((c) => c.id === i.id && c.archive))
  if (withChat.length) fire(dropPhotos(listId, withChat))
}

async function dropPhotos(listId, items) {
  const refs = []
  for (const it of items) {
    const msgs = await getDocs(msgsCol(listId, it.id))
    refs.push(...msgs.docs.filter((m) => m.get('photo')).map((m) => m.ref))
  }
  for (let i = 0; i < refs.length; i += 450) {
    const b = writeBatch(db)
    refs.slice(i, i + 450).forEach((r) => b.update(r, { photo: null, photoDeleted: true }))
    await b.commit()
  }
}

// Istoricul: produsele arhivate, cele mai recente întâi (are nevoie de indexul din firestore.indexes.json).
export function watchHistory(listId, cb, onError) {
  const q = query(itemsCol(listId), where('archived', '==', true), orderBy('resolvedAt', 'desc'), limit(200))
  return onSnapshot(q, mapSnap(cb), (e) => onError?.(e))
}

export function watchProducts(listId, cb) {
  return onSnapshot(productsCol(listId), mapSnap(cb), (e) => console.error(e))
}

// ---------- Discuția unui produs ----------

export function watchMessages(listId, itemId, cb, onError) {
  const q = query(msgsCol(listId, itemId), orderBy('at'))
  return onSnapshot(q, mapSnap(cb), (e) => onError?.(e))
}

export function sendMessage(listId, itemId, user, { text = '', photo = null }) {
  const b = writeBatch(db)
  b.set(doc(msgsCol(listId, itemId)), { text: text.trim(), photo, by: who(user), at: serverTimestamp(), reactions: {} })
  b.update(itemDoc(listId, itemId), { msgCount: increment(1), lastMsgAt: serverTimestamp(), lastMsgBy: user.uid })
  fire(b.commit())
}

export function toggleReaction(listId, itemId, msgId, reactionId, uid, on) {
  fire(updateDoc(
    doc(msgsCol(listId, itemId), msgId),
    new FieldPath('reactions', reactionId),
    on ? arrayUnion(uid) : arrayRemove(uid),
  ))
}

export function deleteMessage(listId, itemId, msgId) {
  const b = writeBatch(db)
  b.delete(doc(msgsCol(listId, itemId), msgId))
  b.update(itemDoc(listId, itemId), { msgCount: increment(-1) })
  fire(b.commit())
}

// ---------- Administrare ----------

export function watchAllLists(cb, onError) {
  return onSnapshot(listsCol, mapSnap(cb), (e) => onError?.(e))
}

export function watchAllowed(cb, onError) {
  return onSnapshot(collection(db, 'allowed'), mapSnap(cb), (e) => onError?.(e))
}

export function revokeAccess(email) {
  fire(deleteDoc(doc(db, 'allowed', normEmail(email))))
}

// ---------- Notificări ----------
// Modulele de notificări se încarcă doar când e nevoie, ca aplicația să pornească la fel de repede.

const TOKEN_KEY = 'push-token'
const storedToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }

// 'unsupported' | 'needs-install' (iPhone, din Safari) | 'denied' | 'on' | 'off'
export function pushStatus() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return /iPhone|iPad/.test(navigator.userAgent) && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' && storedToken() ? 'on' : 'off'
}

async function messaging() {
  const m = await import('firebase/messaging')
  if (!(await m.isSupported())) throw new Error('Telefonul sau browserul nu permite notificări.')
  return { m, messaging: m.getMessaging(app) }
}

export async function enablePush(user) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notificările nu au fost permise.')
  const { m, messaging: msg } = await messaging()
  const reg = await navigator.serviceWorker.ready
  const opts = { serviceWorkerRegistration: reg }
  if (import.meta.env.VITE_FIREBASE_VAPID_KEY) opts.vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  const token = await m.getToken(msg, opts)
  if (!token) throw new Error('Nu am primit un cod de notificare de la Google.')
  await setDoc(doc(db, 'pushTokens', token), {
    uid: user.uid, email: user.email, at: serverTimestamp(), ua: navigator.userAgent.slice(0, 200),
  })
  localStorage.setItem(TOKEN_KEY, token)
}

export async function disablePush() {
  const token = storedToken()
  if (!token) return
  localStorage.removeItem(TOKEN_KEY)
  await deleteDoc(doc(db, 'pushTokens', token)).catch((e) => console.error(e))
  try {
    const { m, messaging: msg } = await messaging()
    await m.deleteToken(msg)
  } catch (e) { console.error(e) }
}

// Trimite anunțul celorlalți membri. Întoarce { phones, withoutPhone: [emailuri] }.
export async function announce(listId, text) {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const call = httpsCallable(getFunctions(app, 'europe-central2'), 'announce')
  const res = await call({ listId, text })
  return res.data
}