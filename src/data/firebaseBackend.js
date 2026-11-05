import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch, FieldPath,
} from 'firebase/firestore'
import { normEmail, who, newItemFields, finishTripChanges } from './shared.js'
import { productKey } from '../aisles.js'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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

export const signOut = () => fbSignOut(auth)

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
