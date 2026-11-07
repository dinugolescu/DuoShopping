// Funcția din cloud care trimite notificările „Gata, anunță”.
// Aplicația o apelează când cineva termină de lucrat pe o listă; funcția verifică dreptul,
// găsește telefoanele celorlalți membri (colecția `pushTokens`) și le trimite o singură notificare.
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
// Aceeași regiune ca baza de date; cel mult 2 instanțe, ca să nu poată crește costul.
setGlobalOptions({ region: 'europe-central2', maxInstances: 2 })
const db = getFirestore()

const MIN_GAP_MS = 20_000 // un anunț la cel mult 20 de secunde de la același om
const OLD_HOST = 'duoshopping-9d75f.web.app'
const DEAD_TOKEN = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

export const announce = onCall(async (req) => {
  const token = req.auth?.token
  const email = token?.email?.toLowerCase()
  if (!email || token.email_verified !== true) throw new HttpsError('unauthenticated', 'Intră în cont ca să trimiți anunțuri.')

  const { listId, text } = req.data || {}
  if (typeof listId !== 'string' || !listId || listId.includes('/') || typeof text !== 'string' || !text.trim()) {
    throw new HttpsError('invalid-argument', 'Anunțul nu e complet.')
  }

  const snap = await db.doc(`lists/${listId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Lista nu mai există.')
  const list = snap.data()
  if (!list.memberEmails?.includes(email)) throw new HttpsError('permission-denied', 'Nu ești în lista asta.')

  const logRef = db.doc(`announceLog/${req.auth.uid}`)
  const last = (await logRef.get()).get('at')?.toMillis() ?? 0
  if (Date.now() - last < MIN_GAP_MS) throw new HttpsError('resource-exhausted', 'Ai trimis un anunț acum câteva secunde.')
  await logRef.set({ at: FieldValue.serverTimestamp() })

  // Pe o listă de cadouri, cei care primesc cadouri nu primesc anunțurile (ar strica surpriza).
  const recipients = list.kind === 'gifts' ? list.recipients || [] : []
  const others = list.memberEmails.filter((e) => e !== email && !recipients.includes(e))
  if (!others.length) return { phones: 0, withoutPhone: [] }

  const tokSnap = await db.collection('pushTokens').where('email', 'in', others.slice(0, 30)).get()
  // Aplicația s-a mutat de pe duoshopping-9d75f.web.app. Codurile salvate de acolo (sau dinainte să ținem
  // adresa) deschid browserul pe adresa veche. Cine are deja un cod de pe adresa nouă primește doar acolo,
  // iar codurile vechi i se șterg; cine n-are încă, primește în continuare pe cel vechi.
  const isOld = (d) => !d.get('origin') || d.get('origin') === OLD_HOST
  const freshEmails = new Set(tokSnap.docs.filter((d) => !isOld(d)).map((d) => d.get('email')))
  const stale = tokSnap.docs.filter((d) => isOld(d) && freshEmails.has(d.get('email')))
  await Promise.all(stale.map((d) => d.ref.delete()))
  const used = tokSnap.docs.filter((d) => !stale.includes(d))
  const tokens = used.map((d) => d.id)
  const withPhone = new Set(used.map((d) => d.get('email')))
  const withoutPhone = others.filter((e) => !withPhone.has(e))
  if (!tokens.length) return { phones: 0, withoutPhone }

  // Mesaj doar cu date: service worker-ul aplicației (public/push-sw.js) afișează notificarea.
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: { title: list.name, body: text.trim().slice(0, 400), url: '/', tag: `lista-${listId}` },
    webpush: { headers: { Urgency: 'high', TTL: String(24 * 3600) } },
  })

  // Telefoanele care au dezinstalat aplicația sau au oprit notificările: le scoatem din listă.
  const dead = res.responses.flatMap((r, i) => (!r.success && DEAD_TOKEN.has(r.error?.code) ? [tokens[i]] : []))
  await Promise.all(dead.map((t) => db.doc(`pushTokens/${t}`).delete()))
  if (res.failureCount > dead.length) {
    console.warn('Notificări netrimise:', res.responses.filter((r) => !r.success).map((r) => r.error?.code))
  }

  return { phones: res.successCount, withoutPhone }
})

// Ștergerea completă a unei liste (produse, mesaje, poze, partea ascunsă a listei de cadouri, catalog).
// O face serverul, pentru că nici adminul, nici cine primește cadouri nu are voie să citească tot conținutul
// (vezi firestore.rules). Au voie creatorul listei și adminul. Numele a rămas din prima variantă (doar admin).
export const adminDeleteList = onCall(async (req) => {
  const token = req.auth?.token
  const email = token?.email?.toLowerCase()
  if (!email || token.email_verified !== true) throw new HttpsError('unauthenticated', 'Intră în cont.')

  const { listId } = req.data || {}
  if (typeof listId !== 'string' || !listId || listId.includes('/')) throw new HttpsError('invalid-argument', 'Lista lipsește.')
  const ref = db.doc(`lists/${listId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Lista nu mai există.')
  const isOwner = snap.get('ownerUid') === req.auth.uid
  if (!isOwner && !(await db.doc(`admins/${email}`).get()).exists) {
    throw new HttpsError('permission-denied', 'Doar cine a creat lista sau adminul o poate șterge.')
  }
  await db.recursiveDelete(ref)
  return { ok: true }
})
