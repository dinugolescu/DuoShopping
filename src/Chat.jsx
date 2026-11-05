// Discuția despre un produs: mesaje, poze comprimate și reacții cu emoji.
import { useEffect, useRef, useState } from 'react'
import * as api from './data/index.js'
import { REACTIONS } from './data/shared.js'
import { compressImage } from './image.js'
import { relTime } from './time.js'
import { Sheet, firstName, useNow, useToast, errText } from './ui.jsx'
import { IconCamera, IconSend, IconX } from './icons.jsx'

export function ChatSheet({ list, item, user, onClose }) {
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

  useEffect(() => api.watchMessages(list.id, item.id, setMsgs, (e) => toast(errText(e))), [list.id, item.id, toast])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])

  async function choosePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { setPhoto(await compressImage(file)) } catch (err) { toast(err.message) } finally { setBusy(false) }
  }

  function send(e) {
    e.preventDefault()
    if (!text.trim() && !photo) return
    api.sendMessage(list.id, item.id, user, { text, photo })
    setText('')
    setPhoto(null)
  }

  function react(m, r) {
    const mine = (m.reactions?.[r.id] || []).includes(user.uid)
    api.toggleReaction(list.id, item.id, m.id, r.id, user.uid, !mine)
    setActiveId(null)
  }

  function remove(m) {
    if (!window.confirm('Ștergi mesajul?')) return
    api.deleteMessage(list.id, item.id, m.id)
    setActiveId(null)
  }

  return (
    <Sheet title={`Discuție: ${item.name}`} onClose={onClose} className="chat">
      <div className="chat-msgs">
        {msgs === null && <p className="center muted">Se încarcă…</p>}
        {msgs?.length === 0 && (
          <p className="center muted pad small">
            Nicio întrebare încă. Ex.: „De care cafea?” sau trimite o poză cu raftul: „Doar astea sunt, pe care o iei?”
          </p>
        )}
        {msgs?.map((m) => {
          const mine = m.by?.uid === user.uid
          const shown = REACTIONS.filter((r) => m.reactions?.[r.id]?.length)
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              {!mine && <div className="msg-author">{firstName(m.by?.name)}</div>}
              <button className="bubble" onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                aria-label={`Mesaj de la ${firstName(m.by?.name)}. Apasă pentru reacții.`}>
                {m.photo && (
                  <img src={m.photo} alt="Poză trimisă în discuție" className="msg-photo"
                    onClick={(e) => { e.stopPropagation(); setZoom(m.photo) }} />
                )}
                {m.text && <span className="msg-text">{m.text}</span>}
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
                    <button key={r.id} onClick={() => react(m, r)} aria-label={`Reacție ${r.emoji}`}>{r.emoji}</button>
                  ))}
                  {mine && <button className="danger small" onClick={() => remove(m)}>Șterge</button>}
                </div>
              )}
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {photo && (
        <div className="photo-preview">
          <img src={photo} alt="Poza de trimis" />
          <button className="icon-btn" onClick={() => setPhoto(null)} aria-label="Renunță la poză"><IconX /></button>
        </div>
      )}
      <form className="composer" onSubmit={send}>
        <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Atașează o poză">
          <IconCamera />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
        <input className="grow" value={text} onChange={(e) => setText(e.target.value)}
          placeholder={busy ? 'Se pregătește poza…' : 'Scrie un mesaj…'} maxLength={1000} enterKeyHint="send" aria-label="Mesaj" />
        <button className="add-btn" disabled={busy || (!text.trim() && !photo)} aria-label="Trimite"><IconSend /></button>
      </form>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="Poză mărită">
          <img src={zoom} alt="Poză mărită" />
        </div>
      )}
    </Sheet>
  )
}
