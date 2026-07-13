import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../api'
import EmojiPicker from './EmojiPicker'
import './Composer.css'

const MAX_MEDIA = 4
const VALID_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]

// ─── @ mention autocomplete hook ─────────────────────────────────────────────
function useMentionAutocomplete(text, textareaRef) {
  const [suggestions, setSuggestions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null) // { start, query }
  const debounceRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const before = text.slice(0, pos)
    const match = before.match(/@([a-zA-Z0-9_]*)$/)
    if (!match) {
      setMentionQuery(null)
      setSuggestions([])
      return
    }
    const query = match[1]
    const start = pos - match[0].length
    setMentionQuery({ start, query })
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (query.length === 0) { setSuggestions([]); return }
      try {
        const data = await api.get(`/social/search-users?q=${encodeURIComponent(query)}`)
        setSuggestions(data.users || [])
      } catch {
        setSuggestions([])
      }
    }, 200)
  }, [text, textareaRef])

  const pickSuggestion = useCallback((username, setText) => {
    if (!mentionQuery) return
    const el = textareaRef.current
    const pos = el ? el.selectionStart : text.length
    const before = text.slice(0, mentionQuery.start)
    const after = text.slice(pos)
    const inserted = `@${username} `
    const next = before + inserted + after
    setText(next.slice(0, 280))
    setSuggestions([])
    setMentionQuery(null)
    setTimeout(() => {
      if (el) {
        const cursor = before.length + inserted.length
        el.focus()
        el.setSelectionRange(cursor, cursor)
      }
    }, 0)
  }, [mentionQuery, text, textareaRef])

  return { suggestions, pickSuggestion }
}

export default function Composer({ initials, onPost }) {
  const [text, setText] = useState('')
  const [mediaFiles, setMediaFiles] = useState([]) // { id, file, preview, type }
  const [location, setLocation] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const emojiWrapRef = useRef(null)
  const dragCounter = useRef(0)

  const { suggestions, pickSuggestion } = useMentionAutocomplete(text, textareaRef)

  // Cleanup object URLs on unmount
  useEffect(() => {
    const files = mediaFiles
    return () => files.forEach(m => URL.revokeObjectURL(m.preview))
  }, []) // eslint-disable-line

  function processFiles(fileList) {
    const slots = MAX_MEDIA - mediaFiles.length
    if (slots <= 0) return
    const toAdd = Array.from(fileList)
      .filter(f => VALID_TYPES.includes(f.type))
      .slice(0, slots)
    if (!toAdd.length) return
    setMediaFiles(prev => [
      ...prev,
      ...toAdd.map(file => ({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
      })),
    ])
  }

  function removeMedia(id) {
    setMediaFiles(prev => {
      const item = prev.find(m => m.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter(m => m.id !== id)
    })
  }

  function handleFileChange(e) {
    processFiles(e.target.files)
    e.target.value = ''
  }

  // ─── Drag & drop ────────────────────────────────────────────────────────────
  function onDragEnter(e) {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }
  function onDragLeave(e) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }
  function onDragOver(e) { e.preventDefault() }
  function onDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  // ─── Emoji insertion ─────────────────────────────────────────────────────────
  function insertEmoji(emoji) {
    const el = textareaRef.current
    if (!el) { setText(t => t + emoji); setShowEmojiPicker(false); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = text.slice(0, start) + emoji + text.slice(end)
    if (next.length <= 280) {
      setText(next)
      const pos = start + [...emoji].length
      setTimeout(() => { el.focus(); el.setSelectionRange(pos, pos) }, 0)
    }
    setShowEmojiPicker(false)
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return
    function handler(e) {
      if (emojiWrapRef.current && !emojiWrapRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  // ─── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && mediaFiles.length === 0) return
    if (trimmed.length > 280) { setError('Post cannot exceed 280 characters.'); return }

    setError('')
    setPosting(true)

    const formData = new FormData()
    formData.append('body', trimmed)
    if (location.trim()) formData.append('location', location.trim())
    mediaFiles.forEach(m => formData.append('media', m.file))

    try {
      const data = await api.postForm('/posts', formData)
      mediaFiles.forEach(m => URL.revokeObjectURL(m.preview))
      setText('')
      setMediaFiles([])
      setLocation('')
      setShowLocation(false)
      setShowEmojiPicker(false)
      onPost(data.post)
    } catch (err) {
      setError(err.message || 'Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  const charsLeft = 280 - text.length
  const canPost = (text.trim().length > 0 || mediaFiles.length > 0) && !posting

  return (
    <article
      className={`card composer-card${isDragging ? ' composer-dragging' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drop overlay */}
      {isDragging && (
        <div className="composer-drop-overlay">
          <div className="composer-drop-inner">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="40" height="40" rx="8" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="6 4"/>
              <path d="M24 16v16M16 24l8-8 8 8" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Drop photos or videos here</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="composer-row">
          <div className="avatar">{initials}</div>
          <div className="composer-body">
            <textarea
              ref={textareaRef}
              className="composer-textarea"
              placeholder="What is happening?"
              value={text}
              onChange={e => { setText(e.target.value); setError('') }}
              maxLength={280}
              rows={2}
            />

            {/* @mention suggestions dropdown */}
            {suggestions.length > 0 && (
              <ul className="mention-suggestions">
                {suggestions.map(u => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="mention-suggestion-item"
                      onMouseDown={e => { e.preventDefault(); pickSuggestion(u.username, setText) }}
                    >
                      <span className="mention-suggestion-name">{u.first_name} {u.last_name}</span>
                      <span className="mention-suggestion-handle">@{u.username}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Media previews */}
            {mediaFiles.length > 0 && (
              <div className={`composer-media-grid composer-media-${mediaFiles.length}`}>
                {mediaFiles.map(m => (
                  <div key={m.id} className="composer-media-item">
                    {m.type === 'video' ? (
                      <video src={m.preview} className="composer-media-thumb" muted />
                    ) : (
                      <img src={m.preview} alt="" className="composer-media-thumb" />
                    )}
                    <button
                      type="button"
                      className="composer-media-remove"
                      onClick={() => removeMedia(m.id)}
                      aria-label="Remove media"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)"/>
                        <path d="M9 9l6 6M15 9l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {m.type === 'video' && (
                      <div className="composer-video-badge" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add-more slot if < 4 */}
                {mediaFiles.length < MAX_MEDIA && (
                  <button
                    type="button"
                    className="composer-media-add-more"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add more media"
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Location input row */}
            {showLocation && (
              <div className="composer-location-row">
                <svg viewBox="0 0 24 24" fill="none" className="composer-location-icon" aria-hidden="true">
                  <path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10.5" r="1.5" stroke="#2563eb" strokeWidth="1.8"/>
                </svg>
                <input
                  type="text"
                  className="composer-location-input"
                  placeholder="Add location (e.g. New York, NY)"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <button
                  type="button"
                  className="composer-location-clear"
                  onClick={() => { setLocation(''); setShowLocation(false) }}
                  aria-label="Remove location"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <div className="composer-error">{error}</div>}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="composer-emoji-wrap" ref={emojiWrapRef}>
            <EmojiPicker onSelect={insertEmoji} />
          </div>
        )}

        {/* Action bar */}
        <div className="composer-actions">
          <div className="composer-icons">
            {/* Media button */}
            <button
              type="button"
              className={`icon-button${mediaFiles.length >= MAX_MEDIA ? ' icon-button-disabled' : ''}`}
              aria-label="Add photo or video"
              title={mediaFiles.length >= MAX_MEDIA ? 'Maximum 4 media items' : 'Add photo or video'}
              onClick={() => mediaFiles.length < MAX_MEDIA && fileInputRef.current?.click()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <circle cx="8.5" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 15l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Emoji button */}
            <button
              type="button"
              className={`icon-button${showEmojiPicker ? ' icon-button-active' : ''}`}
              aria-label="Add emoji"
              title="Add emoji"
              onClick={() => setShowEmojiPicker(v => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M9 10.75h.01M15 10.75h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8.5 14.5c.9 1.8 6.1 1.8 7 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Location button */}
            <button
              type="button"
              className={`icon-button${showLocation ? ' icon-button-active' : ''}`}
              aria-label="Tag location"
              title="Tag location"
              onClick={() => {
                setShowLocation(v => !v)
                if (showLocation) setLocation('')
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="10.5" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.7"/>
              </svg>
            </button>

            {/* Char counter */}
            {text.length > 0 && (
              <span className={`char-count${charsLeft < 20 ? ' char-warn' : ''}`}>
                {charsLeft}
              </span>
            )}
          </div>

          <button className="primary-button" type="submit" disabled={!canPost}>
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </article>
  )
}
