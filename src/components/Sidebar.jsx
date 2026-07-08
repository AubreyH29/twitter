import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  {
    label: 'Home',
    href: '/feed',
    icon: <path d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-6h-7.5v6H3.75A.75.75 0 013 21V9.75z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: 'Explore',
    href: '/explore',
    icon: <><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></>,
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: <path d="M12 3a6 6 0 016 6c0 3.5-1 5-3 6.5H9C7 15 6 13.5 6 9a6 6 0 016-6zm0 0v-1m-2 17h4m-4 0a2 2 0 004 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: <><path d="M3 7.5V18a1.5 1.5 0 001.5 1.5H20.5A1.5 1.5 0 0022 18V7.5a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 7.5z" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 7.5L12 13.5 21 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
  },
  {
    label: 'Bookmarks',
    href: '/bookmarks',
    icon: <path d="M6 4.5h12v15l-6-4.5L6 19.5v-15z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: 'Profile',
    href: null,
    icon: <><circle cx="12" cy="8.25" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5.75 20.25v-1.75a5.25 5.25 0 0110.5 0v1.75" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  },
]

export default function Sidebar({ activeItem }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const profileHref = user ? `/profile/${user.username}` : '#'
  const displayName = user ? `${user.firstName} ${user.lastName}` : ''
  const handle = user ? `@${user.username}` : ''
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 5.5a8.5 8.5 0 01-2.4.66 4.2 4.2 0 001.85-2.32 8.4 8.4 0 01-2.66 1.02 4.18 4.18 0 00-7.12 3.81 11.86 11.86 0 01-8.6-4.36 4.18 4.18 0 001.29 5.58 4.16 4.16 0 01-1.9-.53v.05a4.18 4.18 0 003.35 4.1 4.2 4.2 0 01-1.9.07 4.18 4.18 0 003.9 2.9 8.38 8.38 0 01-5.18 1.79A8.5 8.5 0 012 19.5a11.84 11.84 0 006.42 1.88c7.71 0 11.93-6.39 11.93-11.92 0-.18 0-.36-.01-.53A8.5 8.5 0 0022 5.5z" fill="#111827" />
          </svg>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const to = item.label === 'Profile' ? profileHref : item.href
          const isActive = activeItem === item.label
          return (
            <Link key={item.label} className={`nav-item${isActive ? ' active' : ''}`} to={to}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg>
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="profile-card">
          <div className="avatar small">{initials}</div>
          <div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-handle">{handle}</div>
          </div>
          <button className="profile-more logout-btn" aria-label="Log out" title="Log out" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
