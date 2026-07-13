import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { api } from '../api'
import './Feed.css'
import './Messages.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function initials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName, size = 40 }) {
  return (
    <div className="dm-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(firstName, lastName)}
    </div>
  )
}

// ─── New Message Modal ────────────────────────────────────────────────────────

function NewMessageModal({ onClose, onStart }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.get(`/messages/users/search?q=${encodeURIComponent(query)}`)
        setResults(data)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="dm-modal-overlay" onClick={onClose}>
      <div className="dm-modal" onClick={e => e.stopPropagation()}>
        <div className="dm-modal-header">
          <button className="dm-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <span className="dm-modal-title">New Message</span>
        </div>
        <div className="dm-modal-search">
          <svg className="dm-search-icon" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9"/><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
          <input
            ref={inputRef}
            className="dm-modal-input"
            placeholder="Search people"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="dm-modal-results">
          {loading && <div className="dm-modal-hint">Searching…</div>}
          {!loading && query && results.length === 0 && <div className="dm-modal-hint">No users found.</div>}
          {results.map(u => (
            <button key={u.id} className="dm-modal-user" onClick={() => onStart(u.username)}>
              <Avatar firstName={u.first_name} lastName={u.last_name} size={36} />
              <div>
                <div className="dm-modal-user-name">{u.first_name} {u.last_name}</div>
                <div className="dm-modal-user-handle">@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Conversation List ────────────────────────────────────────────────────────

function ConversationList({ conversations, activeId, onSelect, onNewMessage }) {
  return (
    <div className="dm-list-panel">
      <div className="dm-list-header">
        <span className="dm-list-title">Messages</span>
        <button className="dm-new-btn" onClick={onNewMessage} aria-label="New message">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
        </button>
      </div>
      <div className="dm-list-body">
        {conversations.length === 0 && (
          <div className="dm-list-empty">
            <p>No conversations yet.</p>
            <p>Start a new message to connect with someone.</p>
          </div>
        )}
        {conversations.map(c => (
          <button
            key={c.id}
            className={`dm-conv-item${activeId === c.id ? ' active' : ''}`}
            onClick={() => onSelect(c)}
          >
            <Avatar firstName={c.other_first_name} lastName={c.other_last_name} size={44} />
            <div className="dm-conv-info">
              <div className="dm-conv-top">
                <span className="dm-conv-name">{c.other_first_name} {c.other_last_name}</span>
                <span className="dm-conv-time">{formatTime(c.last_message_at)}</span>
              </div>
              <div className="dm-conv-preview">{c.last_message_body || 'No messages yet'}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine, onReply }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`dm-msg-row${isMine ? ' mine' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isMine && <Avatar firstName={msg.sender_first_name} lastName={msg.sender_last_name} size={32} />}
      <div className="dm-msg-content">
        {msg.reply_to_id && (
          <div className="dm-reply-quote">
            <span className="dm-reply-quote-who">@{msg.reply_to_username}</span>
            <span className="dm-reply-quote-body">{msg.reply_to_body}</span>
          </div>
        )}
        <div className="dm-bubble">{msg.body}</div>
        <div className="dm-msg-time">{formatTime(msg.created_at)}</div>
      </div>
      {hovered && (
        <button className="dm-reply-btn" onClick={() => onReply(msg)} aria-label="Reply">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor"/></svg>
        </button>
      )}
    </div>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ conversationId, other, currentUserId, onBack }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get(`/messages/conversations/${conversationId}`)
      setMessages(data.messages)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [conversationId])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    setReplyTo(null)
    setText('')
    loadMessages()
  }, [conversationId, loadMessages])

  // Poll for new messages every 3s
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [loadMessages])

  // Scroll to bottom when messages load/change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const msg = await api.post(`/messages/conversations/${conversationId}`, {
        body,
        reply_to_id: replyTo?.id || null,
      })
      setMessages(prev => [...prev, msg])
      setText('')
      setReplyTo(null)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="dm-chat-panel">
      {/* Header */}
      <div className="dm-chat-header">
        <button className="dm-back-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
        </button>
        {other && <Avatar firstName={other.first_name} lastName={other.last_name} size={36} />}
        {other && (
          <div className="dm-chat-header-info">
            <div className="dm-chat-header-name">{other.first_name} {other.last_name}</div>
            <div className="dm-chat-header-handle">@{other.username}</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="dm-chat-body">
        {loading && <div className="dm-loading">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="dm-chat-empty">
            {other && <Avatar firstName={other.first_name} lastName={other.last_name} size={64} />}
            {other && <div className="dm-chat-empty-name">{other.first_name} {other.last_name}</div>}
            {other && <div className="dm-chat-empty-handle">@{other.username}</div>}
            <p>This is the beginning of your conversation.</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_id === currentUserId}
            onReply={m => { setReplyTo(m); textareaRef.current?.focus() }}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="dm-composer">
        {replyTo && (
          <div className="dm-composer-reply">
            <span>Replying to <strong>@{replyTo.sender_username}</strong>: {replyTo.body.slice(0, 80)}{replyTo.body.length > 80 ? '…' : ''}</span>
            <button className="dm-composer-reply-cancel" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        <div className="dm-composer-row">
          <textarea
            ref={textareaRef}
            className="dm-composer-input"
            placeholder="Start a new message"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={10000}
          />
          <button
            className="dm-send-btn"
            onClick={send}
            disabled={!text.trim() || sending}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── No Selection Placeholder ─────────────────────────────────────────────────

function NoChatSelected({ onNewMessage }) {
  return (
    <div className="dm-no-chat">
      <div className="dm-no-chat-icon">
        <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
          <path d="M3 7.5V18a1.5 1.5 0 001.5 1.5H20.5A1.5 1.5 0 0022 18V7.5a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 7.5z" stroke="#2563eb" strokeWidth="1.8"/>
          <path d="M3 7.5L12 13.5 21 7.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3>Select a message</h3>
      <p>Choose from your existing conversations or start a new one.</p>
      <button className="dm-no-chat-btn" onClick={onNewMessage}>New Message</button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)   // { id, other_* }
  const [otherUser, setOtherUser] = useState(null)      // full other-user info from chat load
  const [showModal, setShowModal] = useState(false)
  const [mobileView, setMobileView] = useState('list')  // 'list' | 'chat'

  // Load conversation list
  useEffect(() => {
    async function load() {
      try {
        const data = await api.get('/messages/conversations')
        setConversations(data)
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleStartConversation(username) {
    setShowModal(false)
    try {
      const conv = await api.post('/messages/conversations', { username })
      // Merge into list if not present
      setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev
        return [{ ...conv, last_message_body: null, last_message_at: null }, ...prev]
      })
      setActiveConv(conv)
      setOtherUser({ id: conv.other_user_id, username: conv.other_username, first_name: conv.other_first_name, last_name: conv.other_last_name })
      setMobileView('chat')
    } catch { /* ignore */ }
  }

  function handleSelectConv(c) {
    setActiveConv(c)
    setOtherUser({ id: c.other_user_id, username: c.other_username, first_name: c.other_first_name, last_name: c.other_last_name })
    setMobileView('chat')
  }

  function handleBack() {
    setMobileView('list')
    setActiveConv(null)
  }

  return (
    <div className="page-shell">
      <Sidebar activeItem="Messages" />

      <main className="content dm-page">
        <div className={`dm-layout${mobileView === 'chat' ? ' mobile-chat' : ''}`}>
          {/* Left: conversation list */}
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id}
            onSelect={handleSelectConv}
            onNewMessage={() => setShowModal(true)}
          />

          {/* Right: chat or empty state */}
          {activeConv ? (
            <ChatPanel
              key={activeConv.id}
              conversationId={activeConv.id}
              other={otherUser}
              currentUserId={user?.id}
              onBack={handleBack}
            />
          ) : (
            <NoChatSelected onNewMessage={() => setShowModal(true)} />
          )}
        </div>
      </main>

      {showModal && (
        <NewMessageModal
          onClose={() => setShowModal(false)}
          onStart={handleStartConversation}
        />
      )}
    </div>
  )
}
