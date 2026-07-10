import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
import Composer from '../components/Composer'
import WhoToFollow from '../components/WhoToFollow'
import './Feed.css'

const TABS = ['For You', 'Following', 'Tech', 'Design', 'News', 'Fitness']

const TRENDS = [
  { title: 'Trending in Tech', sub: 'React 19 · 24.5K posts', avatars: ['R', 'T', 'D'] },
  { title: 'Trending in Design', sub: 'UI Trends 2025 · 12K posts', avatars: ['U', 'I', 'X'] },
  { title: 'Trending Worldwide', sub: 'Open Source · 8.2K posts', avatars: ['O', 'S', 'G'] },
  { title: 'Trending in Business', sub: 'Startups · 5.1K posts', avatars: ['S', 'B', 'V'] },
]

export default function Feed() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  const tabsRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [quotePost, setQuotePost] = useState(null)
  const [quoteBody, setQuoteBody] = useState('')
  const [quoteError, setQuoteError] = useState('')
  const sentinelRef = useRef(null)

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'

  const loadPosts = useCallback(async (pageNum) => {
    try {
      const data = await api.get(`/posts?page=${pageNum}`)
      if (pageNum === 1) setPosts(data.posts)
      else setPosts(prev => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      setLoadingInitial(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { loadPosts(1) }, [loadPosts])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        loadPosts(page + 1)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, loadPosts])

  async function submitQuote(e) {
    e.preventDefault()
    if (!quotePost) return
    setQuoteError('')
    try {
      const form = new FormData()
      form.append('body', quoteBody.trim())
      form.append('quote_post_id', String(quotePost.id))
      const data = await api.postForm('/posts', form)
      setPosts(prev => [{
        ...data.post,
        quoted_body: quotePost.body,
        quoted_media_urls: quotePost.media_urls || [],
        quoted_created_at: quotePost.created_at,
        quoted_user_id: quotePost.user_id,
        quoted_first_name: quotePost.first_name,
        quoted_last_name: quotePost.last_name,
        quoted_username: quotePost.username,
      }, ...prev])
      setQuotePost(null)
      setQuoteBody('')
    } catch (err) {
      setQuoteError(err.message || 'Failed to quote post.')
    }
  }

  const updateArrows = () => {
    const el = tabsRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 0)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }
  useEffect(() => {
    const el = tabsRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows)
    window.addEventListener('resize', updateArrows)
    updateArrows()
    return () => { el.removeEventListener('scroll', updateArrows); window.removeEventListener('resize', updateArrows) }
  }, [])

  return (
    <div className="page-shell">
      <Sidebar activeItem="Home" />

      {/* ── Main Feed ── */}
      <main className="content">
        <div className="topnav-sticky">
          <div className="tabs-wrap">
            <div className="page-tabs" ref={tabsRef}>
              {TABS.map((t, i) => (
                <button key={i} className={`tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="tab-controls">
              <button className="tab-toggle" disabled={!canPrev} aria-label="Scroll tabs left" onClick={() => tabsRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="tab-toggle" disabled={!canNext} aria-label="Scroll tabs right" onClick={() => tabsRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>

        <section className="feed">
          <Composer initials={initials} onPost={(post) => setPosts(prev => [post, ...prev])} />

          {loadingInitial && <div className="feed-loading-state">Loading posts…</div>}

          {posts.map((p) => (
            <PostCard key={`${p.id}-${p.activity_at || p.created_at}-${p.reposted_by_id || 'post'}`} post={p} onQuote={setQuotePost} />
          ))}

          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore && <span className="feed-loading">Loading more…</span>}
            {!loadingMore && !hasMore && posts.length > 0 && (
              <span className="feed-loading">You're all caught up</span>
            )}
          </div>
        </section>
      </main>

      {/* ── Right Aside ── */}
      <aside className="aside-right">
        <div className="aside-sticky">
          <div className="search-box">
            <input type="search" placeholder="Search" />
            <span className="search-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M16.5 16.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </span>
          </div>

          <div className="card explore-card">
            <div className="section-heading">
              <div className="section-title">Trending</div>
              <div className="section-status">Live</div>
            </div>
            <div className="trend-list">
              {TRENDS.map((t, i) => (
                <div key={i} className="trend-item">
                  <div className="trend-title">{t.title}</div>
                  <div className="trend-meta">
                    <div className="trend-avatars">
                      {t.avatars.map((a, j) => <div key={j} className="avatar tiny">{a}</div>)}
                    </div>
                    <div className="trend-subtitle">{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <WhoToFollow />
        </div>
      </aside>

      {quotePost && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setQuotePost(null) }}>
          <form className="quote-modal" onSubmit={submitQuote}>
            <div className="quote-modal-header">
              <h2>Quote post</h2>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setQuotePost(null)}>×</button>
            </div>
            <textarea
              value={quoteBody}
              onChange={e => setQuoteBody(e.target.value.slice(0, 280))}
              placeholder="Add a comment"
              rows={4}
              autoFocus
            />
            <div className="quoted-post quote-modal-preview">
              <div className="quoted-post-meta"><strong>{quotePost.first_name} {quotePost.last_name}</strong> <span>@{quotePost.username}</span></div>
              {quotePost.body && <p className="quoted-post-text">{quotePost.body}</p>}
            </div>
            {quoteError && <div className="composer-error">{quoteError}</div>}
            <div className="quote-modal-actions">
              <span>{quoteBody.length}/280</span>
              <button className="primary-button" type="submit">Post</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
