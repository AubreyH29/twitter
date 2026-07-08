import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function WhoToFollow() {
  const [users, setUsers] = useState([])
  const [followed, setFollowed] = useState({})

  useEffect(() => {
    api.get('/social/who-to-follow')
      .then(data => setUsers(data.users))
      .catch(err => console.error('Who to follow error:', err))
  }, [])

  async function handleFollow(username) {
    const isNowFollowing = !followed[username]
    setFollowed(prev => ({ ...prev, [username]: isNowFollowing }))
    try {
      if (isNowFollowing) await api.post(`/social/follow/${username}`)
      else await api.del(`/social/follow/${username}`)
    } catch {
      setFollowed(prev => ({ ...prev, [username]: !isNowFollowing }))
    }
  }

  if (users.length === 0) return null

  return (
    <div className="card follow-card">
      <div className="section-title">Who to follow</div>
      {users.map(u => {
        const initials = `${u.first_name[0]}${u.last_name[0]}`.toUpperCase()
        const isFollowing = followed[u.username] || false
        return (
          <div key={u.id} className="follow-person">
            <div className="follow-person-info">
              <Link to={`/profile/${u.username}`} className="avatar small" style={{ textDecoration: 'none' }}>
                {initials}
              </Link>
              <div className="follow-person-text">
                <Link to={`/profile/${u.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="follow-name">{u.first_name} {u.last_name}</div>
                </Link>
                <div className="follow-meta">@{u.username}</div>
              </div>
            </div>
            <button
              className="follow-button"
              onClick={() => handleFollow(u.username)}
              style={isFollowing ? { background: 'transparent', border: '1.5px solid #d1d5db', color: '#374151' } : undefined}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
