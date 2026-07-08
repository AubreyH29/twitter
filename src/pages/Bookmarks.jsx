import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
import WhoToFollow from '../components/WhoToFollow'
import './Feed.css'

export default function Bookmarks() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const sentinelRef = useRef(null)

  const loadPosts = useCallback(async (pageNum) => {
    try {
      const data = await api.get(`/social/bookmarks?page=${pageNum}`)
      if (pageNum === 1) setPosts(data.posts)
      else setPosts(prev => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load bookmarks:', err)
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
      <Sidebar activeItem="Bookmarks" />

      <main className="content">
        <div className="topnav-sticky">
          <div style={{ padding: '4px 0' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Bookmarks</h2>
          </div>
        </div>

        <section className="feed" style={{ paddingTop: 16 }}>
          {loadingInitial && <div className="feed-loading-state">Loading bookmarks…</div>}

          {!loadingInitial && posts.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔖</div>
              <p style={{ margin: 0 }}>No bookmarks yet. Save posts by clicking the bookmark icon.</p>
            </div>
          )}

          {posts.map(p => <PostCard key={p.id} post={p} />)}

          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore && <span className="feed-loading">Loading more…</span>}
            {!loadingMore && !hasMore && posts.length > 0 && (
              <span className="feed-loading">All bookmarks loaded</span>
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
