import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
import WhoToFollow from '../components/WhoToFollow'
import './Feed.css'

const TRENDS = [
  { title: 'Trending in Tech', sub: 'React 19 · 24.5K posts', avatars: ['R', 'T', 'D'] },
  { title: 'Trending in Design', sub: 'UI Trends 2025 · 12K posts', avatars: ['U', 'I', 'X'] },
  { title: 'Trending Worldwide', sub: 'Open Source · 8.2K posts', avatars: ['O', 'S', 'G'] },
  { title: 'Trending in Business', sub: 'Startups · 5.1K posts', avatars: ['S', 'B', 'V'] },
]

export default function Explore() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const sentinelRef = useRef(null)

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

  return (
    <div className="page-shell">
      <Sidebar activeItem="Explore" />

      <main className="content">
        <div className="topnav-sticky">
          <div style={{ padding: '4px 0' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Explore</h2>
          </div>
        </div>

        <div className="card explore-card" style={{ marginTop: 16 }}>
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

        <section className="feed">
          {loadingInitial && <div className="feed-loading-state">Loading posts…</div>}
          {posts.map(p => <PostCard key={p.id} post={p} />)}
          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore && <span className="feed-loading">Loading more…</span>}
            {!loadingMore && !hasMore && posts.length > 0 && (
              <span className="feed-loading">You're all caught up</span>
            )}
          </div>
        </section>
      </main>

      <aside className="aside-right">
        <div className="aside-sticky">
          <WhoToFollow />
        </div>
      </aside>
    </div>
  )
}
