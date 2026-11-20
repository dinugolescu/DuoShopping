// Discuția despre un produs sau despre toată lista: mesaje, poze comprimate și reacții cu emoji.
import { useEffect, useRef, useState } from 'react'
import * as api from './data/index.js'
import { REACTIONS } from './data/shared.js'
import { compressImage } from './image.js'
import { relTime } from './time.js'
import { Sheet, firstName, useNow, useToast, errText, useBackClose, store } from './ui.jsx'
import { IconCamera, IconSend, IconX } from './icons.jsx'
import { t } from './i18n.jsx'
import { usePrefs } from './prefs.js'
import { personName, mentionedEmails, partialMention, splitMentions, fold } from './people.js'
import { isGiftList } from './gifts.js'

const LIST_SEEN_KEY = 'discutie-lista-vazuta'
const BANNER_MAX_AGE = 2 * 24 * 3600 * 1000

// Discuția listei, văzută din antet: câte mesaje noi de la ceilalți și ultimul anunț necitit (pentru
// banda de sus). Ce ai văzut se ține minte pe telefon, ca la discuția produselor. `list` null = nu urmărim
// (ex. cine primește cadouri, care n-are acces la discuția listei).
export function useListChat(list, user) {
  const [msgs, setMsgs] = useState([])
  const [seen, setSeen] = useState(() => store.get(LIST_SEEN_KEY, {}))
  useEffect(() => {
    setMsgs([])
    if (!list) return undefined
    return api.watchListChat(list.id, setMsgs, (e) => console.error(e))
  }, [list?.id])
  if (!list) return { count: 0, unread: 0, banner: null, markSeen: () => {} }
  const since = seen[list.id] ?? 0
  const fresh = msgs.filter((m) => m.by?.uid !== user.uid && (m.at ?? Date.now()) > since)
  const banner = fresh.find((m) => m.announce && Date.now() - (m.at ?? Date.now()) < BANNER_MAX_AGE) || null
  const markSeen = () => {
    const next = { ...store.get(LIST_SEEN_KEY, {}), [list.id]: Date.now() }
    setSeen(next)
    store.set(LIST_SEEN_KEY, next)
  }
  return { count: msgs.length, unread: fresh.length, banner, markSeen }
}

// `scope` 'secret': discuția doar între cei care cumpără, pe o listă de cadouri.
// `scope` 'list': discuția întregii liste (fără `item`); aici apar și anunțurile („Gata, anunță”).
export function ChatSheet({ list, item, user, onClose, scope }) {
  const toast = useToast()
  const now = useNow()
  const [msgs, setMsgs] = useState(null)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [activeId, setActiveId] = useState(null) // mesajul cu bara de reacții deschisă
  const [zoom, setZoom] = useState(null)
  const endRef = useRef()
  const fileRef = useRef()

  useEffect(() => api.watchMessages(list.id, item?.id, setMsgs, (e) => toast(errText(e)), scope), [list.id, item?.id, toast, scope])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])

  async function choosePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { setPhoto(await compressImage(file)) } catch (err) { toast(err.message) } finally { setBusy(false) }
  }

  // Cine poate fi chemat cu @: ceilalți din listă (pe cadouri, fără cei care primesc).
  const aliases = usePrefs().aliases
  const receivers = isGiftList(list) ? list.recipients || [] : []
  const callable = list.memberEmails.filter((m) => m !== user.email && !receivers.includes(m))
  const partial = partialMention(text)
  const suggestions = partial === null ? [] : callable.filter((m) => fold(personName(m, aliases)).startsWith(fold(partial))).slice(0, 5)
  const pickMention = (m) => setText((s) => s.replace(/@([\p{L}\p{N}_]*)$/u, `@${personName(m, aliases)} `))

  function send(e) {
    e.preventDefault()
    if (!text.trim() && !photo) return
    api.sendMessage(list.id, item?.id, user, { text, photo }, scope)
    // Cine e chemat cu @ primește o notificare care duce la mesaj.
    const called = mentionedEmails(text, callable, user.email, aliases)
    if (called.length) {
      api.announce(list.id, `${firstName(user.name)}: ${text.trim()}`.slice(0, 400), {
        to: called, itemId: item?.id, ...(scope === 'secret' ? { scope } : {}), mention: true,
      }).catch((err) => console.error(err))
    }
    setText('')
    setPhoto(null)
  }

  function react(m, r) {
    const mine = (m.reactions?.[r.id] || []).includes(user.uid)
    api.toggleReaction(list.id, item?.id, m.id, r.id, user.uid, !mine, scope)
    setActiveId(null)
  }

  // Un mesaj (sau doar poza lui) îl șterge cine l-a scris sau creatorul listei.
  const canDelete = (m) => m.by?.uid === user.uid || list.ownerUid === user.uid
  function remove(m) {
    if (!window.confirm(t('deleteMsgConfirm'))) return
    api.deleteMessage(list.id, item?.id, m.id, scope)
    setActiveId(null)
  }
  function removePhoto(m) {
    if (!window.confirm(t('deletePhotoConfirm'))) return
    api.deleteMessagePhoto(list.id, item?.id, m.id, scope)
    setActiveId(null)
  }

  return (
    <Sheet title={scope === 'list' ? t('listChatTitle', list.name) : t(scope === 'secret' ? 'secretChatTitle' : 'chatTitle', item.name)} onClose={onClose} className="chat">
      <div className="chat-msgs">
        {msgs === null && <p className="center muted">{t('loading')}</p>}
        {msgs?.length === 0 && <p className="center muted pad small">{t(scope === 'list' ? 'listChatEmpty' : 'chatEmpty')}</p>}
        {msgs?.map((m) => {
          const mine = m.by?.uid === user.uid
          const shown = REACTIONS.filter((r) => m.reactions?.[r.id]?.length)
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''} ${m.announce ? 'announce' : ''}`}>
              {!mine && <div className="msg-author">{firstName(m.by?.name)}</div>}
              <button className="bubble" onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                aria-label={t('msgFrom', firstName(m.by?.name))}>
                {m.photo && (
                  <img src={m.photo} alt={t('chatPhotoAlt')} className="msg-photo"
                    onClick={(e) => { e.stopPropagation(); setZoom(m.photo) }} />
                )}
                {m.photoDeleted && <span className="msg-text muted small">{t('photoDeleted')}</span>}
                {m.announce && <span className="msg-kind">📣 {t('announceMsg')}{m.to?.length > 0 && ` · ${t('announceFor', m.to.join(', '))}`}</span>}
                {m.text && <span className="msg-text">{splitMentions(m.text).map((p, k) => (p.tag ? <b key={k} className="mention">{p.text}</b> : p.text))}</span>}
                <span className="msg-time">{relTime(m.at, now)}</span>
              </button>
              {shown.length > 0 && (
                <div className="reactions">
                  {shown.map((r) => {
                    const uids = m.reactions[r.id]
                    return (
                      <button key={r.id} className={`reaction ${uids.includes(user.uid) ? 'mine' : ''}`} onClick={() => react(m, r)}>
                        {r.emoji} {uids.length > 1 && uids.length}
                      </button>
                    )
                  })}
                </div>
              )}
              {activeId === m.id && (
                <div className="react-bar">
                  {REACTIONS.map((r) => (
                    <button key={r.id} onClick={() => react(m, r)} aria-label={t('reactionLabel', r.emoji)}>{r.emoji}</button>
                  ))}
                  {canDelete(m) && m.photo && <button className="danger small" onClick={() => removePhoto(m)}>{t('deletePhoto')}</button>}
                  {canDelete(m) && <button className="danger small" onClick={() => remove(m)}>{t(m.photo ? 'deleteMsg' : 'delete')}</button>}
                </div>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {photo && (
        <div className="photo-preview">
          <img src={photo} alt={t('photoToSend')} />
          <button className="icon-btn" onClick={() => setPhoto(null)} aria-label={t('dropPhoto')}><IconX /></button>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="mention-bar" role="listbox" aria-label={t('mentionHint')}>
          {suggestions.map((m) => (
            <button key={m} type="button" className="chip" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(m)}>
              @{personName(m, aliases)}
            </button>
          ))}
        </div>
      )}
      <form className="composer" onSubmit={send}>
        <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} disabled={busy} aria-label={t('attachPhoto')}>
          <IconCamera />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
        <input className="grow" value={text} onChange={(e) => setText(e.target.value)}
          placeholder={busy ? t('preparingPhoto') : callable.length ? `${t('writeMsg')} · @` : t('writeMsg')} maxLength={1000} enterKeyHint="send" aria-label={t('message')} />
        <button className="add-btn" disabled={busy || (!text.trim() && !photo)} aria-label={t('send')}><IconSend /></button>
      </form>

      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </Sheet>
  )
}

export function Lightbox({ src, onClose }) {
  useBackClose(onClose)
  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={t('zoomedPhoto')}>
      <img src={src} alt={t('zoomedPhoto')} />

    </div>
  )
}
