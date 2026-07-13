import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
import ReplyModal from '../components/ReplyModal'
import './Feed.css'
import './PostThread.css'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function isVideo(url) {
  return /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(url)
}

// Render body with @mention links
function PostBody({ text }) {
  if (!text) return null
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g)
  return (
    <p className="thread-focused-body">
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <Link key={i} to={`/profile/${part.slice(1)}`} className="mention-link">
              {part}
            </Link>
          )
        }
        return part
      })}
    </p>
  )
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

// Full-size focused post (not a card — displayed prominently)
function FocusedPost({ post, onReply }) {
  const authorInitials = `${post.first_name[0]}${post.last_name[0]}`.toUpperCase()
  const authorName = `${post.first_name} ${post.last_name}`
  const media = post.media_urls || []

  return (
    <div className="thread-focused-post">
      {post.reply_to_username && (
        <div className="reply-context" style={{ marginBottom: 8 }}>
          Replying to{' '}
          <Link to={`/profile/${post.reply_to_username}`}>@{post.reply_to_username}</Link>
        </div>
      )}
      <div className="thread-focused-header">
        <Link to={`/profile/${post.username}`} className="avatar avatar-link">{authorInitials}</Link>
        <div>
          <Link to={`/profile/${post.username}`} className="post-author-link">
            <div className="post-author">{authorName}</div>
          </Link>
          <div className="post-meta">@{post.username}</div>
        </div>
      </div>

      {post.body && <PostBody text={post.body} />}

      {media.length > 0 && (
        <div className={`post-media-grid post-media-${Math.min(media.length, 4)}`} style={{ marginTop: 12 }}>
          {media.map((url, i) => (
            <div key={i} className="post-media-item">
              {isVideo(url)
                ? <video src={url} className="post-media-thumb" controls />
                : <img src={url} alt="" className="post-media-thumb" loading="lazy" />}
            </div>
          ))}
        </div>
      )}

      <div className="thread-focused-time">
        {new Date(post.created_at).toLocaleString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </div>

      <div className="thread-focused-stats">
        {post.repost_count > 0 && (
          <span><strong>{post.repost_count}</strong> Reposts</span>
        )}
        {post.reply_count > 0 && (
          <span><strong>{post.reply_count}</strong> Replies</span>
        )}
        {post.like_count > 0 && (
          <span><strong>{post.like_count}</strong> Likes</span>
        )}
      </div>

      <div className="thread-focused-actions">
        <button className="action-button" aria-label="Reply" onClick={() => onReply(post)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5.75h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H10.5l-4.5 3v-3H6a1.5 1.5 0 01-1.5-1.5v-7.5A1.5 1.5 0 016 5.75z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reply
        </button>
      </div>
    </div>
  )
}

// Inline composer for replying directly in the thread
function InlineReplyComposer({ replyToPost, onReply }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)
  const myInitials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'
  const charsLeft = 280 - text.length
  const canSubmit = text.trim().length > 0 && !submitting

  const { suggestions, pickSuggestion } = useMentionAutocomplete(text, textareaRef)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setError('')
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('body', trimmed)
      form.append('reply_to_id', String(replyToPost.id))
      const data = await api.postForm('/posts', form)
      onReply(data.post)
      setText('')
    } catch (err) {
      setError(err.message || 'Failed to post reply.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="thread-inline-composer">
      <div className="avatar thread-inline-avatar">{myInitials}</div>
      <form className="thread-inline-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="thread-inline-textarea"
          placeholder="Post your reply"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 280))}
          rows={2}
        />
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
        <div className="thread-inline-footer">
          <span className={`reply-modal-chars${charsLeft < 20 ? charsLeft < 0 ? ' danger' : ' warning' : ''}`}>
            {charsLeft}
          </span>
          <button type="submit" className="primary-button" disabled={!canSubmit} style={{ padding: '6px 18px', fontSize: '0.85rem' }}>
            {submitting ? 'Replying…' : 'Reply'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function PostThread() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [parentPost, setParentPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [replyModalPost, setReplyModalPost] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  const loadPost = useCallback(async () => {
    try {
      const data = await api.get(`/posts/${id}`)
      setPost(data.post)
      setParentPost(data.parentPost || null)
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      console.error('Load thread error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadReplies = useCallback(async (pageNum) => {
    try {
      const data = await api.get(`/posts/${id}/replies?page=${pageNum}`)
      if (pageNum === 1) setReplies(data.replies)
      else setReplies(prev => [...prev, ...data.replies])
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Load replies error:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setPost(null)
    setParentPost(null)
    setReplies([])
    setPage(1)
    setHasMore(true)
    loadPost()
    loadReplies(1)
  }, [loadPost, loadReplies])

  // Infinite scroll for replies
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        loadReplies(page + 1)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, loadReplies])

  function handleInlineReply(newReply) {
    // Enrich with current user data
    const enriched = {
      ...newReply,
      reply_to_username: post?.username,
      reply_count: 0,
    }
    setReplies(prev => [enriched, ...prev])
    if (post) setPost(p => ({ ...p, reply_count: (p.reply_count || 0) + 1 }))
  }

  function handleReplyFromModal(newReply, originalPost) {
    const enriched = {
      ...newReply,
      reply_to_username: originalPost?.username,
      reply_count: 0,
    }
    // If replying to the focused post, add to top of replies list
    if (originalPost?.id === post?.id) {
      setReplies(prev => [enriched, ...prev])
      if (post) setPost(p => ({ ...p, reply_count: (p.reply_count || 0) + 1 }))
    } else {
      // Replying to a reply — update its reply count in list
      setReplies(prev => prev.map(r =>
        r.id === originalPost?.id ? { ...r, reply_count: (r.reply_count || 0) + 1 } : r
      ))
    }
    setReplyModalPost(null)
  }

  function handleRepostChange(updatedPost, isReposted, data) {
    if (post?.id === updatedPost.id) {
      setPost(p => ({ ...p, reposted_by_me: isReposted, repost_count: data?.repost_count ?? p.repost_count }))
    }
    setReplies(prev => prev.map(r =>
      r.id === updatedPost.id
        ? { ...r, reposted_by_me: isReposted, repost_count: data?.repost_count ?? r.repost_count }
        : r
    ))
  }

  function handleDelete(deletedId) {
    if (deletedId === post?.id) {
      navigate(-1)
    } else {
      setReplies(prev => prev.filter(r => r.id !== deletedId))
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <Sidebar />
        <main className="content">
          <div className="feed-loading-state" style={{ paddingTop: 40 }}>Loading…</div>
        </main>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="page-shell">
        <Sidebar />
        <main className="content">
          <div className="card profile-not-found" style={{ marginTop: 24 }}>
            <p>This tweet doesn't exist or was deleted.</p>
            <button className="primary-button" onClick={() => navigate(-1)} style={{ marginTop: 12 }}>Go back</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="content">
        {/* Back button */}
        <div className="profile-topbar">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="profile-topbar-name">Thread</div>
          </div>
        </div>

        <div className="thread-container">
          {/* Parent post if this is a reply */}
          {parentPost && (
            <div className="thread-parent-wrap">
              <PostCard
                post={parentPost}
                onReply={setReplyModalPost}
                onRepostChange={handleRepostChange}
                onDelete={handleDelete}
                hideThreadLine
              />
              <div className="thread-connector-line" aria-hidden="true" />
            </div>
          )}

          {/* The focused (main) post */}
          <FocusedPost post={post} onReply={setReplyModalPost} />

          {/* Inline reply composer */}
          <div className="thread-reply-divider" />
          <InlineReplyComposer replyToPost={post} onReply={handleInlineReply} />
          <div className="thread-reply-divider" />

          {/* Replies */}
          <div className="feed" style={{ paddingTop: 0 }}>
            {replies.length === 0 && (
              <div className="card profile-empty" style={{ marginTop: 8 }}>
                <p>No replies yet. Be the first to reply!</p>
              </div>
            )}
            {replies.map(r => (
              <PostCard
                key={r.id}
                post={{ ...r, reply_to_username: r.reply_to_username || post.username }}
                onReply={setReplyModalPost}
                onRepostChange={handleRepostChange}
                onDelete={handleDelete}
              />
            ))}
            <div ref={sentinelRef} className="feed-sentinel">
              {loadingMore && <span className="feed-loading">Loading more…</span>}
              {!loadingMore && !hasMore && replies.length > 0 && (
                <span className="feed-loading">All replies loaded</span>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Reply modal (opened from reply buttons on replies) */}
      {replyModalPost && (
        <ReplyModal
          post={replyModalPost}
          onClose={() => setReplyModalPost(null)}
          onReply={handleReplyFromModal}
        />
      )}
    </div>
  )
}
