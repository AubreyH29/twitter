import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import WhoToFollow from '../components/WhoToFollow'
import './Feed.css'
import './Notifications.css'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function notifMessage(n) {
  const name = `${n.actor_first_name} ${n.actor_last_name}`
  if (n.type === 'like') return <><strong>{name}</strong> liked your post</>
  if (n.type === 'follow') return <><strong>{name}</strong> followed you</>
  if (n.type === 'repost') return <><strong>{name}</strong> reposted your post</>
  if (n.type === 'reply') return <><strong>{name}</strong> replied to your post</>
  return <><strong>{name}</strong> interacted with you</>
}

function notifIcon(type) {
  if (type === 'like') return (
    <div className="notif-icon notif-icon-like">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.25s-6.75-4.27-9-8.25C1.5 9.82 4.1 6 8 6c1.63 0 3.3.8 4 2 .7-1.2 2.37-2 4-2 3.9 0 6.5 3.82 5 6.75-2.25 3.98-9 8.25-9 8.25z" fill="#f91880" stroke="#f91880" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
  if (type === 'follow') return (
    <div className="notif-icon notif-icon-follow">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8.25" r="3.25" fill="none" stroke="#2563eb" strokeWidth="1.8" />
        <path d="M5.75 20.25v-1.75a5.25 5.25 0 0110.5 0v1.75" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
  if (type === 'repost') return (
    <div className="notif-icon notif-icon-repost">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 4.75h-4.5a4.25 4.25 0 00-4.25 4.25v1.5" fill="none" stroke="#00ba7c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 7.75l-3.25 3.25 3.25 3.25" fill="none" stroke="#00ba7c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 19.25h4.5a4.25 4.25 0 004.25-4.25v-1.5" fill="none" stroke="#00ba7c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.5 16.25l3.25-3.25-3.25-3.25" fill="none" stroke="#00ba7c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
  return (
    <div className="notif-icon notif-icon-default">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="#6b7280" strokeWidth="1.8" />
        <path d="M12 8v4l2 2" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const data = await api.get('/social/notifications')
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function markAllRead() {
    try {
      await api.put('/social/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }

  return (
    <div className="page-shell">
      <Sidebar activeItem="Notifications" />

      <main className="content">
        <div className="topnav-sticky">
          <div className="notif-header">
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
              Notifications
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </h2>
            {unreadCount > 0 && (
              <button className="notif-read-all" onClick={markAllRead}>Mark all as read</button>
            )}
          </div>
        </div>

        <section className="feed" style={{ paddingTop: 16 }}>
          {loading && <div className="feed-loading-state">Loading notifications…</div>}

          {!loading && notifications.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔔</div>
              <p style={{ margin: 0 }}>No notifications yet. Start interacting!</p>
            </div>
          )}

          {notifications.map(n => (
            <div key={n.id} className={`card notif-item${n.read ? '' : ' notif-unread'}`}>
              {notifIcon(n.type)}
              <div className="notif-body">
                <div className="notif-text">
                  {notifMessage(n)}{' '}
                  <span className="notif-time">{timeAgo(n.created_at)}</span>
                </div>
                {n.post_body && (
                  <div className="notif-post-preview">{n.post_body.slice(0, 100)}{n.post_body.length > 100 ? '…' : ''}</div>
                )}
                <Link to={`/profile/${n.actor_username}`} className="notif-actor-link">
                  @{n.actor_username}
                </Link>
              </div>
            </div>
          ))}
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
