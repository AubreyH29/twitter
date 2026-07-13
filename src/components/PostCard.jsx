import { useState, useRef, useEffect } from 'react'
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

function isVideo(url) {
  return /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(url)
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(post.liked_by_me || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [reposted, setReposted] = useState(post.reposted_by_me || false)
  const [repostCount, setRepostCount] = useState(post.repost_count || 0)
  const [bookmarked, setBookmarked] = useState(post.bookmarked_by_me || false)
  const [lightbox, setLightbox] = useState(null) // url or null
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef(null)

  const isOwnPost = user && user.id === post.user_id

  // Close popover on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  // Close confirm modal on Escape
  useEffect(() => {
    if (!confirmOpen) return
    function handleKey(e) {
      if (e.key === 'Escape') setConfirmOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [confirmOpen])

  function openConfirm() {
    setMenuOpen(false)
    setConfirmOpen(true)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.del(`/posts/${post.id}`)
      setConfirmOpen(false)
      onDelete?.(post.id)
    } catch {
      setDeleting(false)
    }
  }

  const authorInitials = `${post.first_name[0]}${post.last_name[0]}`.toUpperCase()
  const authorName = `${post.first_name} ${post.last_name}`
  const authorHandle = `@${post.username}`
  const media = post.media_urls || []
  const mediaCount = media.length

  async function handleLike() {
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    try {
      if (next) await api.post(`/social/like/${post.id}`)
      else await api.del(`/social/like/${post.id}`)
    } catch {
      setLiked(!next)
      setLikeCount(c => next ? c - 1 : c + 1)
    }
  }

  async function handleRepost() {
    const next = !reposted
    setReposted(next)
    setRepostCount(c => next ? c + 1 : c - 1)
    try {
      if (next) await api.post(`/social/repost/${post.id}`)
      else await api.del(`/social/repost/${post.id}`)
    } catch {
      setReposted(!next)
      setRepostCount(c => next ? c - 1 : c + 1)
    }
  }

  async function handleBookmark() {
    const next = !bookmarked
    setBookmarked(next)
    try {
      if (next) await api.post(`/social/bookmark/${post.id}`)
      else await api.del(`/social/bookmark/${post.id}`)
    } catch {
      setBookmarked(!next)
    }
  }

  return (
    <>
      <article className="card post-card">
        <div className="post-header">
          <div className="row gap-sm">
            <Link to={`/profile/${post.username}`} className="avatar avatar-link">{authorInitials}</Link>
            <div>
              <Link to={`/profile/${post.username}`} className="post-author-link">
                <div className="post-author">{authorName}</div>
              </Link>
              <div className="post-meta">{authorHandle} · {timeAgo(post.created_at)}</div>
            </div>
          </div>
          {isOwnPost && (
            <div className="more-menu-wrap" ref={menuRef}>
              <button
                className={`more-button${menuOpen ? ' more-button--active' : ''}`}
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(o => !o)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </button>

              {menuOpen && (
                <div className="post-popover" role="menu">
                  <div className="post-popover-arrow" aria-hidden="true" />
                  <button
                    className="post-popover-item post-popover-item--danger"
                    role="menuitem"
                    onClick={openConfirm}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="18" height="18">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Delete tweet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {post.body && <p className="post-text">{post.body}</p>}

        {/* Media grid */}
        {mediaCount > 0 && (
          <div className={`post-media-grid post-media-${mediaCount}`}>
            {media.map((url, i) => (
              <div key={i} className="post-media-item" onClick={() => !isVideo(url) && setLightbox(url)}>
                {isVideo(url) ? (
                  <video src={url} className="post-media-thumb" controls onClick={e => e.stopPropagation()} />
                ) : (
                  <img src={url} alt="" className="post-media-thumb" loading="lazy" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Location tag */}
        {post.location && (
          <div className="post-location">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="10.5" r="1.4" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
            {post.location}
          </div>
        )}

        <div className="post-actions">
          <button className="action-button" aria-label="Comments">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 5.75h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H10.5l-4.5 3v-3H6a1.5 1.5 0 01-1.5-1.5v-7.5A1.5 1.5 0 016 5.75z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            0
          </button>

          <button className={`action-button${reposted ? ' reposted' : ''}`} aria-label="Repost" onClick={handleRepost}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 4.75h-4.5a4.25 4.25 0 00-4.25 4.25v1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8.5 7.75l-3.25 3.25 3.25 3.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 19.25h4.5a4.25 4.25 0 004.25-4.25v-1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.5 16.25l3.25-3.25-3.25-3.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {repostCount}
          </button>

          <button className={`action-button${liked ? ' liked' : ''}`} aria-label="Like" onClick={handleLike}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 20.25s-6.75-4.27-9-8.25C1.5 9.82 4.1 6 8 6c1.63 0 3.3.8 4 2 .7-1.2 2.37-2 4-2 3.9 0 6.5 3.82 5 6.75-2.25 3.98-9 8.25-9 8.25z"
                fill={liked ? '#f91880' : 'none'}
                stroke={liked ? '#f91880' : 'currentColor'}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {likeCount}
          </button>

          <button className={`action-button${bookmarked ? ' bookmarked' : ''}`} aria-label="Bookmark" onClick={handleBookmark}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 4.5h12v15l-6-4.5L6 19.5v-15z"
                fill={bookmarked ? '#2563eb' : 'none'}
                stroke={bookmarked ? '#2563eb' : 'currentColor'}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </article>

      {/* Image lightbox */}
      {lightbox && (
        <div className="post-lightbox" onClick={() => setLightbox(null)}>
          <button className="post-lightbox-close" aria-label="Close" onClick={() => setLightbox(null)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <img
            src={lightbox}
            alt=""
            className="post-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmOpen && (
        <div className="delete-modal-backdrop" onClick={() => !deleting && setConfirmOpen(false)}>
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title" onClick={e => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="28" height="28">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id="delete-modal-title" className="delete-modal-title">Delete this tweet?</h2>
            <p className="delete-modal-body">
              This tweet will be removed from your profile and won&apos;t appear in anyone&apos;s feed. This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                className="delete-modal-btn delete-modal-btn--cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="delete-modal-btn delete-modal-btn--confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

