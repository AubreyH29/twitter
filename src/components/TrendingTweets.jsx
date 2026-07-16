import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function initials(post) {
  return `${post.first_name?.[0] || ''}${post.last_name?.[0] || ''}`.toUpperCase() || '?'
}

function engagementLabel(post) {
  const replies = post.reply_count || 0
  const reposts = post.repost_count || 0
  const likes = post.like_count || 0
  const parts = []
  if (replies) parts.push(`${replies} ${replies === 1 ? 'reply' : 'replies'}`)
  if (reposts) parts.push(`${reposts} ${reposts === 1 ? 'repost' : 'reposts'}`)
  if (likes) parts.push(`${likes} ${likes === 1 ? 'like' : 'likes'}`)
  return parts.length ? parts.join(' · ') : 'New conversation'
}

export default function TrendingTweets() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function loadTrendingTweets() {
      try {
        const data = await api.get('/posts/trending?limit=5')
        if (!ignore) setPosts(data.posts || [])
      } catch (err) {
        console.error('Failed to load trending tweets:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadTrendingTweets()
    return () => { ignore = true }
  }, [])

  return (
    <div className="card explore-card trending-tweets-card">
      <div className="section-heading">
        <div className="section-title">Trending tweets</div>
        <div className="section-status">Live</div>
      </div>

      {loading && <div className="trending-empty">Loading trending tweets…</div>}

      {!loading && posts.length === 0 && (
        <div className="trending-empty">No trending tweets yet.</div>
      )}

      <div className="trending-tweet-list">
        {posts.map(post => (
          <Link key={post.id} to={`/post/${post.id}`} className="trending-tweet-item">
            <div className="avatar tiny trending-tweet-avatar">{initials(post)}</div>
            <div className="trending-tweet-content">
              <div className="trending-tweet-author">
                <span>{post.first_name} {post.last_name}</span>
                <small>@{post.username}</small>
              </div>
              {post.body && <p>{post.body}</p>}
              <div className="trending-tweet-meta">{engagementLabel(post)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
