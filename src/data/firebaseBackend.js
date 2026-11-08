import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut,
} from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot, query, where, orderBy, limit, limitToLast,
  serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch, FieldPath, deleteField,
} from 'firebase/firestore'
import { normEmail, who, newItemFields, finishTripChanges } from './shared.js'
import { productKey } from '../aisles.js'
import { t } from '../i18n.jsx'

// Pe iPhone, login-ul din aplicația instalată merge doar dacă pagina de login e pe același domeniu
// cu aplicația (vezi SETUP.md, pasul 5). Aplicația e publicată pe mai multe adrese Firebase, deci
// pe oricare dintre ele folosim adresa curentă; altundeva (ex. localhost) pe cea din configurare.
const host = window.location.host
const authDomain = /\.(web\.app|firebaseapp\.com)$/.test(host) ? host : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
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

// Ascultă o colecție dintr-o listă. Pe o listă abia creată, serverul poate primi cererea înaintea listei
// și o refuză (regulile citesc lista ca să vadă cine e membru). Reîncercăm de câteva ori, cu pauze tot mai
// mari, și arătăm eroarea abia dacă refuzul rămâne.
function listen(q, cb, onError) {
  let unsub = () => {}
  let stopped = false
  let tries = 0
  let timer
  const start = () => {
    unsub = onSnapshot(q, (snap) => { tries = 0; cb(snap.docs.map(fromDoc)) }, (e) => {
      if (e?.code === 'permission-denied' && tries < 6 && !stopped) {
        tries += 1
        timer = setTimeout(start, 700 * tries)
        return
      }
      onError?.(e)
    })
  }
  start()
  return () => { stopped = true; clearTimeout(timer); unsub() }
}

const listsCol = collection(db, 'lists')
const listDoc = (id) => doc(db, 'lists', id)
const itemsCol = (listId) => collection(db, 'lists', listId, 'items')
const itemDoc = (listId, id) => doc(db, 'lists', listId, 'items', id)
// `scope`: 'items' pentru discuția obișnuită a produsului; 'secret' pentru partea ascunsă a unei liste de
// cadouri (cine a rezervat, ce s-a luat, discuția doar între cei care cumpără).
// `scope` 'list': discuția întregii liste (`lists/{id}/chat`), unde ajung și anunțurile („Gata, anunță”).
const msgsCol = (listId, itemId, scope = 'items') => (scope === 'list'
  ? collection(db, 'lists', listId, 'chat')
  : collection(db, 'lists', listId, scope, itemId, 'messages'))
const secretCol = (listId) => collection(db, 'lists', listId, 'secret')
const secretDoc = (listId, id) => doc(db, 'lists', listId, 'secret', id)
const productsCol = (listId) => collection(db, 'lists', listId, 'products')

// ---------- Liste ----------

export function watchLists(user, cb, onError) {
  // Al doilea argument spune dacă răspunsul vine doar din cache (încă neconfirmat de server).
  const q = query(listsCol, where('memberEmails', 'array-contains', user.email))
  return onSnapshot(q, { includeMetadataChanges: true },
    (snap) => cb(snap.docs.map(fromDoc), { fromCache: snap.metadata.fromCache }), (e) => onError?.(e))
}

// `kind`: 'gifts' pentru o listă de cadouri (cu cei care primesc în `recipients`).
export function createList(user, name, kind) {
  const ref = doc(listsCol)
  fire(setDoc(ref, {
    ...(kind === 'gifts' ? { kind, recipients: [] } : {}),
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

// Ștergerea unei liste o face serverul (funcția `adminDeleteList`): pe o listă de cadouri, cine primește
// cadouri nu poate citi tot conținutul, iar adminul nu vede conținutul listelor altora, deci din telefon
// ștergerea ar fi refuzată. Serverul verifică să fie creatorul listei sau adminul.
export async function deleteList(listId) {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  await httpsCallable(getFunctions(app, 'europe-central2'), 'adminDeleteList')({ listId })
}
export const adminDeleteList = deleteList

// Invitația pune adresa în listă și îi dă acces în aplicație.
// `receives`: pe o listă de cadouri, persoana primește cadouri (își vede doar dorințele ei).
export function invite(list, user, email, receives = false) {
  const e = normEmail(email)
  const b = writeBatch(db)
  b.update(listDoc(list.id), { memberEmails: arrayUnion(e), ...(receives ? { recipients: arrayUnion(e) } : {}) })
  b.set(doc(db, 'allowed', e), { email: e, invitedByEmail: user.email, at: serverTimestamp() })
  fire(b.commit())
}

// Acces în aplicație fără nicio listă comună: persoana își face apoi listele ei.
export function inviteToApp(user, email) {
  const e = normEmail(email)
  fire(setDoc(doc(db, 'allowed', e), { email: e, invitedByEmail: user.email, at: serverTimestamp() }))
}

export function removeMember(list, email) {
  const e = normEmail(email)
  fire(updateDoc(listDoc(list.id), { memberEmails: arrayRemove(e), ...(list.kind === 'gifts' ? { recipients: arrayRemove(e) } : {}) }))
}

export function leaveList(list, user) {
  removeMember(list, user.email)
}

// Lista de cadouri: schimbă rolul unui membru (doar creatorul listei).
export function setReceives(listId, email, receives) {
  fire(updateDoc(listDoc(listId), { recipients: receives ? arrayUnion(normEmail(email)) : arrayRemove(normEmail(email)) }))
}

// Lista de cadouri: cineva care primește cadouri doar cu numele (fără cont) și numele afișate (doar creatorul).
export function addNamedRecipient(listId, name) {
  const id = `name:${Math.random().toString(36).slice(2, 10)}`
  fire(updateDoc(listDoc(listId), new FieldPath('recipientNames', id), name.trim(), 'recipients', arrayUnion(id)))
  return id
}

export function setRecipientName(listId, id, name) {
  fire(updateDoc(listDoc(listId), new FieldPath('recipientNames', id), name.trim() || deleteField()))
}

export function removeNamedRecipient(listId, id) {
  fire(updateDoc(listDoc(listId), 'recipients', arrayRemove(id), new FieldPath('recipientNames', id), deleteField()))
}

// ---------- Produse ----------

export function watchItems(listId, cb, onError) {
  // Fără orderBy în query: sortăm în aplicație, ca să nu fie nevoie de index compus.
  const q = query(itemsCol(listId), where('archived', '==', false))
  return listen(q, cb, onError)
}

// Cine primește cadouri citește doar dorințele adăugate de el.
export function watchWishes(listId, uid, cb, onError) {
  const q = query(itemsCol(listId), where('addedBy.uid', '==', uid))
  return listen(q, cb, onError)
}

// `catalog: false` (lista de cadouri): produsul nu intră în sugestii.
export function addItem(listId, user, fields, { catalog = true } = {}) {
  const ref = doc(itemsCol(listId))
  const item = newItemFields(user, fields)
  const b = writeBatch(db)
  b.set(ref, { ...item, addedAt: serverTimestamp() })
  b.update(listDoc(listId), { itemCount: increment(1) })
  // Catalogul listei: de aici vin sugestiile și raionul ținut minte.
  if (catalog) b.set(doc(productsCol(listId), productKey(item.name)), {
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

export async function deleteItem(listId, item, { gift = false } = {}) {
  const msgs = await getDocs(msgsCol(listId, item.id))
  const b = writeBatch(db)
  msgs.docs.forEach((m) => b.delete(m.ref))
  if (gift) {
    const secret = await getDocs(msgsCol(listId, item.id, 'secret'))
    secret.docs.forEach((m) => b.delete(m.ref))
    b.delete(secretDoc(listId, item.id))
  }
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

// ---------- Partea ascunsă a listei de cadouri (doar pentru cei care cumpără) ----------

export function watchSecret(listId, cb, onError) {
  return listen(secretCol(listId), cb, onError)
}

// status: 'pending' | 'reserved' („Iau eu”) | 'bought'
export function setGiftStatus(listId, itemId, user, status) {
  fire(setDoc(secretDoc(listId, itemId), {
    status,
    reservedBy: status === 'pending' ? null : who(user),
    reservedAt: status === 'pending' ? null : serverTimestamp(),
    resolvedBy: status === 'bought' ? who(user) : null,
    resolvedAt: status === 'bought' ? serverTimestamp() : null,
  }, { merge: true }))
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
  return listen(q, cb, onError)
}

export function watchProducts(listId, cb) {
  return listen(productsCol(listId), cb, (e) => console.error(e))
}

// ---------- Discuția unui produs ----------

export function watchMessages(listId, itemId, cb, onError, scope) {
  // Discuția listei crește la nesfârșit: arătăm doar ultimele 200 de mesaje.
  const q = scope === 'list'
    ? query(msgsCol(listId, itemId, scope), orderBy('at'), limitToLast(200))
    : query(msgsCol(listId, itemId, scope), orderBy('at'))
  return listen(q, cb, onError)
}

// Ultimele mesaje din discuția listei (pentru bulina de necitite și anunțul de sus).
export function watchListChat(listId, cb, onError) {
  return listen(query(msgsCol(listId, null, 'list'), orderBy('at', 'desc'), limit(20)), cb, onError)
}

// Contorul de mesaje stă pe produs (discuția obișnuită) sau pe partea lui ascunsă (scope 'secret').
// Discuția listei n-are contor: se numără din mesajele ei.
const counter = (b, listId, itemId, scope, fields) => (scope === 'list' ? null
  : scope === 'secret' ? b.set(secretDoc(listId, itemId), fields, { merge: true })
  : b.update(itemDoc(listId, itemId), fields))

export function sendMessage(listId, itemId, user, { text = '', photo = null }, scope) {
  const b = writeBatch(db)
  b.set(doc(msgsCol(listId, itemId, scope)), { text: text.trim(), photo, by: who(user), at: serverTimestamp(), reactions: {} })
  counter(b, listId, itemId, scope, { msgCount: increment(1), lastMsgAt: serverTimestamp(), lastMsgBy: user.uid })
  fire(b.commit())
}

export function toggleReaction(listId, itemId, msgId, reactionId, uid, on, scope) {
  fire(updateDoc(
    doc(msgsCol(listId, itemId, scope), msgId),
    new FieldPath('reactions', reactionId),
    on ? arrayUnion(uid) : arrayRemove(uid),
  ))
}

// Șterge doar poza dintr-un mesaj; textul rămâne (cu „Poză ștearsă”).
export function deleteMessagePhoto(listId, itemId, msgId, scope) {
  fire(updateDoc(doc(msgsCol(listId, itemId, scope), msgId), { photo: null, photoDeleted: true }))
}

export function deleteMessage(listId, itemId, msgId, scope) {
  const b = writeBatch(db)
  b.delete(doc(msgsCol(listId, itemId, scope), msgId))
  counter(b, listId, itemId, scope, { msgCount: increment(-1) })
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

// ---------- Setări în cont ----------

export async function loadUserPrefs(uid) {
  const snap = await getDoc(doc(db, 'userPrefs', uid))
  return snap.exists() ? snap.data().prefs : null
}

export function saveUserPrefs(uid, prefs) {
  fire(setDoc(doc(db, 'userPrefs', uid), { prefs, at: serverTimestamp() }))
}

// ---------- Ce ai anunțat deja („Gata, anunță”) ----------
// Un document pe om: `lists.<listId>` = { cutoff, done } (vezi myEvents în shared.js).

export function watchAnnounced(uid, cb) {
  return onSnapshot(doc(db, 'announced', uid), (snap) => cb(snap.exists() ? snap.data().lists || {} : {}),
    (e) => { console.error(e); cb({}) })
}

export function saveAnnounced(uid, listId, state) {
  fire(setDoc(doc(db, 'announced', uid), { lists: { [listId]: state }, at: serverTimestamp() }, { merge: true }))
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
  if (!(await m.isSupported())) throw new Error(t('pushUnsupported'))
  return { m, messaging: m.getMessaging(app) }
}

async function currentToken() {
  const { m, messaging: msg } = await messaging()
  const reg = await navigator.serviceWorker.ready
  const opts = { serviceWorkerRegistration: reg }
  if (import.meta.env.VITE_FIREBASE_VAPID_KEY) opts.vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  return m.getToken(msg, opts)
}

// Codul telefonului se salvează cu adresa de pe care a fost pornit (`origin`): funcția `announce` îl
// preferă pe cel de pe adresa de acum față de cele rămase de pe adresa veche.
async function saveToken(user, token) {
  const old = storedToken()
  if (old && old !== token) await deleteDoc(doc(db, 'pushTokens', old)).catch(() => {})
  await setDoc(doc(db, 'pushTokens', token), {
    uid: user.uid, email: user.email, at: serverTimestamp(), ua: navigator.userAgent.slice(0, 200), origin: window.location.host,
  })
  localStorage.setItem(TOKEN_KEY, token)
}

export async function enablePush(user) {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(t('pushNotAllowed'))
  const token = await currentToken()
  if (!token) throw new Error(t('pushNoToken'))
  await saveToken(user, token)
}

// La fiecare pornire: dacă telefonul are notificările pornite, reverificăm codul. Telefonul (mai ales
// iPhone-ul) îl poate schimba sau pierde; așa ajunge mereu cel bun în cont.
export async function refreshPush(user) {
  if (pushStatus() !== 'on') return
  try {
    const token = await currentToken()
    if (token) await saveToken(user, token)
  } catch (e) { console.error(e) }
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