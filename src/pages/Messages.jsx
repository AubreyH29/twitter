import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import WhoToFollow from '../components/WhoToFollow'
import './Feed.css'
import './Messages.css'

export default function Messages() {
  const { user } = useAuth()

  return (
    <div className="page-shell">
      <Sidebar activeItem="Messages" />

      <main className="content">
        <div className="topnav-sticky">
          <div style={{ padding: '4px 0' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>Messages</h2>
          </div>
        </div>

        <div className="messages-empty-state">
          <div className="messages-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 7.5V18a1.5 1.5 0 001.5 1.5H20.5A1.5 1.5 0 0022 18V7.5a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 7.5z" stroke="#2563eb" strokeWidth="1.8" />
              <path d="M3 7.5L12 13.5 21 7.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3>Direct Messages</h3>
          <p>Send private messages to people you follow. Direct messaging is coming soon!</p>
          <div className="messages-coming-soon-badge">Coming Soon</div>
        </div>
      </main>

      <aside className="aside-right">
        <div className="aside-sticky">
          <WhoToFollow />
        </div>
      </aside>
    </div>
  )
}
