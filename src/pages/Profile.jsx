import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import Sidebar from '../components/Sidebar'
import PostCard from '../components/PostCard'
import './Profile.css'
import './Feed.css'

const PROFILE_TABS = ['Posts', 'Likes', 'Replies', 'Media']

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function joinedDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await api.put('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
      })
      onSave(data.user)
    } catch (err) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" role="dialog" aria-label="Edit profile">
        <div className="modal-header">
          <h2 className="modal-title">Edit Profile</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-field">
            <label className="modal-label">First Name</label>
            <input className="modal-input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={50} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">Last Name</label>
            <input className="modal-input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={50} required />
          </div>
          <div className="modal-field">
            <label className="modal-label">
              Bio <span className="modal-char-count">{bio.length}/160</span>
            </label>
            <textarea className="modal-textarea" value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} placeholder="Tell people a little about yourself" rows={3} />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Profile Component ───────────────────────────────────────────────────
export default function Profile() {
  const { username } = useParams()
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [posts, setPosts] = useState([])
  const [likePosts, setLikePosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loadingLikes, setLoadingLikes] = useState(false)
  const sentinelRef = useRef(null)

  const isOwnProfile = user?.username === username

  const loadProfile = useCallback(async (pageNum) => {
    try {
      const data = await api.get(`/posts/user/${username}?page=${pageNum}`)
      setProfile(data.profile)
      setFollowing(data.profile.is_followed_by_me)
      setFollowerCount(data.profile.follower_count)
      setFollowingCount(data.profile.following_count)
      if (pageNum === 1) setPosts(data.posts)
      else setPosts(prev => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      if (err.status === 404) setNotFound(true)
      console.error('Profile load error:', err)
    } finally {
      setLoadingInitial(false)
      setLoadingMore(false)
    }
  }, [username])

  useEffect(() => {
    setLoadingInitial(true)
    setNotFound(false)
    setPosts([])
    setLikePosts([])
    setPage(1)
    setHasMore(true)
    setActiveTab(0)
    loadProfile(1)
  }, [loadProfile])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || activeTab !== 0) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        loadProfile(page + 1)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, loadProfile, activeTab])

  async function handleFollow() {
    if (followLoading) return
    setFollowLoading(true)
    const next = !following
    setFollowing(next)
    setFollowerCount(c => next ? c + 1 : c - 1)
    try {
      if (next) await api.post(`/social/follow/${username}`)
      else await api.del(`/social/follow/${username}`)
    } catch {
      setFollowing(!next)
      setFollowerCount(c => next ? c - 1 : c + 1)
    } finally {
      setFollowLoading(false)
    }
  }

  async function handleTabChange(idx) {
    setActiveTab(idx)
    if (idx === 1 && likePosts.length === 0) {
      setLoadingLikes(true)
      try {
        const data = await api.get(`/social/likes/${username}`)
        setLikePosts(data.posts)
      } catch (err) {
        console.error('Failed to load liked posts:', err)
      } finally {
        setLoadingLikes(false)
      }
    }
  }

  function handleEditSave(updatedUser) {
    updateUser(updatedUser)
    setProfile(prev => ({
      ...prev,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      bio: updatedUser.bio || '',
    }))
    setShowEditModal(false)
  }

  const profileInitials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : '?'

  const activePosts = activeTab === 0 ? posts : activeTab === 1 ? likePosts : []

  return (
    <div className="page-shell">
      <Sidebar activeItem="Profile" />

      {/* ── Profile Main ── */}
      <main className="content">
        <div className="profile-topbar">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 7l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="profile-topbar-name">{profile ? `${profile.firstName} ${profile.lastName}` : ''}</div>
            <div className="profile-topbar-count">{posts.length} posts</div>
          </div>
        </div>

        {notFound ? (
          <div className="card profile-not-found">
            <p>This account doesn't exist.</p>
            <Link to="/feed">Go to Feed</Link>
          </div>
        ) : (
          <>
            <div className="profile-header-card">
              <div className="profile-banner"></div>
              <div className="profile-header-body">
                <div className="profile-avatar-wrap">
                  <div className="avatar profile-avatar">{loadingInitial ? '?' : profileInitials}</div>
                  {isOwnProfile && (
                    <button className="edit-profile-btn" onClick={() => setShowEditModal(true)}>Edit profile</button>
                  )}
                  {!isOwnProfile && (
                    <button
                      className={`follow-button profile-follow-btn${following ? ' profile-following-btn' : ''}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
                <div className="profile-info">
                  <div className="profile-fullname">{profile ? `${profile.firstName} ${profile.lastName}` : ''}</div>
                  <div className="profile-username">@{username}</div>
                  {profile?.bio && <div className="profile-bio">{profile.bio}</div>}
                  <div className="profile-joined">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 15, height: 15 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    Joined {profile ? joinedDate(profile.createdAt) : ''}
                  </div>
                  <div className="profile-stats">
                    <span><strong>{posts.length}</strong> Posts</span>
                    <span><strong>{followingCount}</strong> Following</span>
                    <span><strong>{followerCount}</strong> Followers</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-tabs">
              {PROFILE_TABS.map((tab, idx) => (
                <button
                  key={tab}
                  className={`profile-tab${activeTab === idx ? ' active' : ''}`}
                  onClick={() => handleTabChange(idx)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <section className="feed">
              {(activeTab === 0 && loadingInitial) && <div className="feed-loading-state">Loading posts…</div>}
              {(activeTab === 1 && loadingLikes) && <div className="feed-loading-state">Loading liked posts…</div>}
              {activeTab === 2 && <div className="card profile-empty"><p>Replies aren't available yet.</p></div>}
              {activeTab === 3 && <div className="card profile-empty"><p>Media posts aren't available yet.</p></div>}

              {!loadingInitial && activeTab === 0 && posts.length === 0 && (
                <div className="card profile-empty">
                  <p>{isOwnProfile ? "You haven't posted yet. Share something!" : "No posts yet."}</p>
                  {isOwnProfile && (
                    <Link to="/feed" className="primary-button" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 12 }}>
                      Post something
                    </Link>
                  )}
                </div>
              )}

              {!loadingLikes && activeTab === 1 && likePosts.length === 0 && (
                <div className="card profile-empty">
                  <p>{isOwnProfile ? "You haven't liked any posts yet." : "No liked posts yet."}</p>
                </div>
              )}

              {activePosts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  onDelete={(id) => setPosts(prev => prev.filter(x => x.id !== id))}
                />
              ))}

              {activeTab === 0 && (
                <div ref={sentinelRef} className="feed-sentinel">
                  {loadingMore && <span className="feed-loading">Loading more…</span>}
                  {!loadingMore && !hasMore && posts.length > 0 && (
                    <span className="feed-loading">All posts loaded</span>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Right Aside ── */}
      <aside className="aside-right">
        <div className="aside-sticky">
          <div className="search-box">
            <input type="search" placeholder="Search" />
            <span className="search-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16.5 16.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          {profile && (
            <div className="card follow-card">
              <div className="section-title">About @{username}</div>
              <div className="profile-aside-info">
                {profile.bio && (
                  <div className="profile-aside-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <span style={{ fontStyle: 'italic', color: '#374151', fontSize: '0.87rem' }}>{profile.bio}</span>
                  </div>
                )}
                <div className="profile-aside-row">
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#6b7280" strokeWidth="1.7" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="#6b7280" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span>Joined {joinedDate(profile.createdAt)}</span>
                </div>
                <div className="profile-aside-row">
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" fill="none" stroke="#6b7280" strokeWidth="1.7" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" fill="none" stroke="#6b7280" strokeWidth="1.7" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="#6b7280" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span>{followerCount} Followers · {followingCount} Following</span>
                </div>
                <div className="profile-aside-row">
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path d="M12 20.25s-6.75-4.27-9-8.25C1.5 9.82 4.1 6 8 6c1.63 0 3.3.8 4 2 .7-1.2 2.37-2 4-2 3.9 0 6.5 3.82 5 6.75-2.25 3.98-9 8.25-9 8.25z" fill="none" stroke="#6b7280" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{posts.length} posts</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {showEditModal && profile && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} onSave={handleEditSave} />
      )}
    </div>
  )
}
