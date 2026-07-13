import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

// ─── @ mention autocomplete hook ─────────────────────────────────────────────
function useMentionAutocomplete(text, textareaRef) {
  const [suggestions, setSuggestions] = useState([])
  const [mentionQuery, setMentionQuery] = useState(null)
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

// The post being replied to shown as context in the modal
function OriginalPost({ post }) {
  const authorInitials = `${post.first_name[0]}${post.last_name[0]}`.toUpperCase()
  const authorName = `${post.first_name} ${post.last_name}`
  return (
    <div className="reply-modal-original">
      <div className="reply-modal-original-left">
        <div className="avatar reply-modal-avatar">{authorInitials}</div>
        <div className="reply-modal-thread-line" aria-hidden="true" />
      </div>
      <div className="reply-modal-original-content">
        <div className="reply-modal-original-meta">
          <strong className="reply-modal-author-name">{authorName}</strong>
          <span className="reply-modal-author-handle">@{post.username}</span>
          <span className="reply-modal-dot">·</span>
          <span className="reply-modal-time">{timeAgo(post.created_at)}</span>
        </div>
        {post.body && <p className="reply-modal-original-body">{post.body}</p>}
        <div className="reply-modal-replying-to">
          Replying to{' '}
          <Link to={`/profile/${post.username}`} onClick={e => e.stopPropagation()}>
            @{post.username}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ReplyModal({ post, onClose, onReply }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  const { suggestions, pickSuggestion } = useMentionAutocomplete(text, textareaRef)

  const myInitials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'
  const charsLeft = 280 - text.length
  const canSubmit = text.trim().length > 0 && !submitting

  // Auto-focus textarea
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setError('')
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('body', trimmed)
      form.append('reply_to_id', String(post.id))
      const data = await api.postForm('/posts', form)
      onReply?.(data.post, post)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to post reply.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="reply-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Reply to tweet"
    >
      <div className="reply-modal">
        {/* Header */}
        <div className="reply-modal-header">
          <button className="reply-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Original post context */}
        <OriginalPost post={post} />

        {/* Reply composer */}
        <form className="reply-modal-composer" onSubmit={handleSubmit}>
          <div className="reply-modal-composer-left">
            <div className="avatar reply-modal-my-avatar">{myInitials}</div>
          </div>
          <div className="reply-modal-composer-right">
            <textarea
              ref={textareaRef}
              className="reply-modal-textarea"
              placeholder="Post your reply"
              value={text}
              onChange={e => setText(e.target.value.slice(0, 280))}
              rows={3}
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
            {error && <div className="reply-modal-error">{error}</div>}
            <div className="reply-modal-footer">
              <span className={`reply-modal-chars${charsLeft < 20 ? charsLeft < 0 ? ' danger' : ' warning' : ''}`}>
                {charsLeft}
              </span>
              <button
                type="submit"
                className="primary-button reply-modal-submit"
                disabled={!canSubmit}
              >
                {submitting ? 'Replying…' : 'Reply'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
