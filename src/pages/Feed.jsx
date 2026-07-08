import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
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
  const sentinelRef = useRef(null)

  const [composerText, setComposerText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

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

  async function handlePost(e) {
    e.preventDefault()
    const text = composerText.trim()
    if (!text) return
    if (text.length > 280) { setPostError('Post cannot exceed 280 characters.'); return }
    setPostError('')
    setPosting(true)
    try {
      const data = await api.post('/posts', { body: text })
      setPosts(prev => [data.post, ...prev])
      setComposerText('')
    } catch (err) {
      setPostError(err.message)
    } finally {
      setPosting(false)
    }
  }

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
          <article className="card composer-card">
            <form onSubmit={handlePost}>
              <div className="composer-row">
                <div className="avatar">{initials}</div>
                <textarea
                  placeholder="What is happening?"
                  value={composerText}
                  onChange={e => { setComposerText(e.target.value); setPostError('') }}
                  maxLength={280}
                />
              </div>
              {postError && <div className="composer-error">{postError}</div>}
              <div className="composer-actions">
                <div className="composer-icons">
                  {[
                    ['Add photo', <><path d="M4.75 6.25h14.5v11.5H4.75z" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M4.75 9.25l4.5 5.5 3.75-4.5 5.25 6.75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>],
                    ['Add emoji', <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9 10.5h.01M15 10.5h.01M8.5 15.5c1.25 1.25 3.25 1.25 4.5 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></>],
                    ['Add location', <><path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="10.5" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" /></>],
                  ].map(([label, icon], i) => (
                    <button key={i} type="button" className="icon-button" aria-label={label}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
                    </button>
                  ))}
                  {composerText.length > 0 && (
                    <span className={`char-count${composerText.length > 260 ? ' char-warn' : ''}`}>
                      {280 - composerText.length}
                    </span>
                  )}
                </div>
                <button className="primary-button" type="submit" disabled={posting || composerText.trim().length === 0}>
                  {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </form>
          </article>

          {loadingInitial && <div className="feed-loading-state">Loading posts…</div>}

          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
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
    </div>
  )
}
