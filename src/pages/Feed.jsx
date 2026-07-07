import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Feed.css'

const NAV_ITEMS = [
  { label: 'Home',         icon: <path d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75v-6h-7.5v6H3.75A.75.75 0 013 21V9.75z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
  { label: 'Explore',      icon: <><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9"/><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></> },
  { label: 'Notifications',icon: <path d="M18 8.5c0-3.04-2.46-5.5-5.5-5.5S7 5.46 7 8.5c0 3.22-1.5 4.5-4 5.5 0 0 2.5 0 4.5-1.5 1.25.83 2.75 1.25 4.5 1.25 3.04 0 5.5-2.46 5.5-5.5V8.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/> },
  { label: 'Messages',     icon: <><path d="M3 7.5V18a1.5 1.5 0 001.5 1.5H20.5A1.5 1.5 0 0022 18V7.5a1.5 1.5 0 00-1.5-1.5H4.5A1.5 1.5 0 003 7.5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M3 7.5L12 13.5 21 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></> },
  { label: 'Grok',         icon: <path d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.7-4.3-2.3L8.7 16l.8-4.7L6 8.3l4.8-.8L12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
  { label: 'Premium',      icon: <><path d="M4.75 5.75h14.5v12.5H4.75z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M4.75 8.75h14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> },
  { label: 'Lists',        icon: <><path d="M9 3.75h6v16.5H9z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M6 7.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> },
  { label: 'Bookmarks',    icon: <path d="M6 4.5h12v15l-6-4.5L6 19.5v-15z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/> },
  { label: 'Profile',      icon: <><circle cx="12" cy="8.25" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5.75 20.25v-1.75a5.25 5.25 0 0110.5 0v1.75" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> },
  { label: 'More',         icon: <><path d="M6 12h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6 6h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6 18h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></> },
]

const TABS = ['For You', 'Following', 'Design Inspiration', 'Designers to Follow', 'News', 'Tech', 'Design', 'Fitness']

const POSTS = [
  { initials: 'DB', author: 'David Bend',    handle: '@davidbend998',  time: '2h',  text: 'Woody Harrelson: "I can\'t help but wonder, in spite of all the criticism Bobby Kennedy Jr. received for encouraging us to be somewhat skeptical about these rushed Covid vaccines ... What if he was right?"', comments: 233, reposts: 2,  likes: 4,  views: 5 },
  { initials: 'AL', author: 'Alan Liu',       handle: '@alanliu',       time: '3h',  text: 'Design patterns evolve when constraints change — embrace simplification.', comments: 12, reposts: 3, likes: 28, views: 64 },
  { initials: 'MK', author: 'Maya K.',        handle: '@mayak',         time: '1h',  text: 'Quick UI wins: spacing and contrast — tiny changes, big results.', comments: 8, reposts: 5, likes: 21, views: 48 },
  { initials: 'SR', author: 'S. Rivera',      handle: '@srivera',       time: '4h',  text: 'Prototype early, iterate faster — get feedback, not perfection.', comments: 6, reposts: 1, likes: 14, views: 38 },
  { initials: 'TR', author: 'T. Robinson',    handle: '@trobinson',     time: '5h',  text: 'Accessibility is not optional — design it in from day one.', comments: 3, reposts: 0, likes: 9,  views: 22 },
  { initials: 'AB', author: 'A. Brown',       handle: '@abrown',        time: '2h',  text: 'Small improvements compound — ship often.', comments: 4, reposts: 1, likes: 12, views: 22 },
  { initials: 'CD', author: 'C. Diaz',        handle: '@cdiaz',         time: '3h',  text: 'Think in systems, not isolated features.', comments: 2, reposts: 0, likes: 9,  views: 15 },
  { initials: 'EF', author: 'E. Foster',      handle: '@efoster',       time: '1h',  text: 'Edge cases tell the real story.', comments: 3, reposts: 2, likes: 7,  views: 40 },
  { initials: 'GH', author: 'G. Hale',        handle: '@ghale',         time: '6h',  text: 'Document intent, not just code.', comments: 1, reposts: 0, likes: 5,  views: 12 },
  { initials: 'IJ', author: 'I. James',       handle: '@ijames',        time: '2h',  text: 'Good defaults reduce decision fatigue.', comments: 0, reposts: 1, likes: 6,  views: 9 },
  { initials: 'KL', author: 'K. Lee',         handle: '@klee',          time: '7h',  text: 'Measure what matters — then iterate.', comments: 5, reposts: 2, likes: 30, views: 120 },
  { initials: 'MN', author: 'M. Nguyen',      handle: '@mnguyen',       time: '45m', text: 'Caching thoughtfully can save hours of work.', comments: 2, reposts: 1, likes: 11, views: 34 },
  { initials: 'OP', author: 'O. Patel',       handle: '@optl',          time: '2h',  text: 'Onboarding docs should make you redundant.', comments: 7, reposts: 2, likes: 18, views: 55 },
  { initials: 'QR', author: 'Q. Rios',        handle: '@qrios',         time: '9h',  text: 'Simplicity is not the absence of complexity.', comments: 0, reposts: 0, likes: 4,  views: 8 },
  { initials: 'ST', author: 'S. Thompson',    handle: '@sthompson',     time: '12h', text: 'Design for the slowest connection first.', comments: 2, reposts: 1, likes: 10, views: 39 },
  { initials: 'UV', author: 'U. Varela',      handle: '@uvara',         time: '20m', text: 'Automate the tedious, keep the delightful human.', comments: 1, reposts: 0, likes: 3,  views: 6 },
  { initials: 'WX', author: 'W. Xu',          handle: '@wxu',           time: '3h',  text: 'Split big PRs into reviewable chunks.', comments: 6, reposts: 1, likes: 14, views: 70 },
  { initials: 'YZ', author: 'Y. Zhao',        handle: '@yzhao',         time: '4h',  text: 'Practice QA early — save production surprises.', comments: 0, reposts: 0, likes: 2,  views: 11 },
  { initials: 'BA', author: 'B. Ahmed',       handle: '@bahmed',        time: '9h',  text: 'Telemetry helps you learn what users actually do.', comments: 3, reposts: 1, likes: 8,  views: 27 },
  { initials: 'CB', author: 'C. Barnes',      handle: '@cbarnes',       time: '11h', text: 'Ship prototypes, then validate with customers.', comments: 2, reposts: 0, likes: 16, views: 60 },
  { initials: 'DC', author: 'D. Cruz',        handle: '@dcruz',         time: '2d',  text: 'Write tests for the bug you fixed today.', comments: 1, reposts: 0, likes: 4,  views: 13 },
]

const TRENDS = [
  { title: 'Biden: Truth Over Smooth Speeches', sub: 'Trending Now · Politics', avatars: ['B','D','N'] },
  { title: 'NY Times Editorial Board Weighs in on Biden\'s 2024 Chances', sub: 'Trending Now · Politics', avatars: ['NY','ET','OP'] },
  { title: 'Trump\'s 30+ False Claims Ignite Debate Critique', sub: 'Trending Now · Politics', avatars: ['TR','CP','RM'] },
  { title: 'Calls to 25th Amendment Biden Removal Grow', sub: 'Trending Now · Politics', avatars: ['AM','SD','JK'] },
]

const FOLLOW = [
  { initials: 'D', name: 'Dan Milaunton',    handle: '@guildwithdan48' },
  { initials: 'A', name: 'Amilia Gonzales',  handle: '@amilia7781_y' },
  { initials: 'K', name: 'Kim Chiushu',      handle: '@kim_from_theworld' },
]

export default function Feed() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const tabsRef = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  // Infinite scroll
  const PAGE_SIZE = 8
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < POSTS.length) {
          setLoadingMore(true)
          // Simulate async load — in production replace with a real API call
          setTimeout(() => {
            setVisibleCount(c => Math.min(c + PAGE_SIZE, POSTS.length))
            setLoadingMore(false)
          }, 600)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount])

  function handleLogout() {
    logout()
    navigate('/')
  }

  // Derive display values from session
  const displayName = user ? `${user.firstName} ${user.lastName}` : ''
  const handle = user ? `@${user.username}` : ''
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?'

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
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  return (
    <div className="page-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 5.5a8.5 8.5 0 01-2.4.66 4.2 4.2 0 001.85-2.32 8.4 8.4 0 01-2.66 1.02 4.18 4.18 0 00-7.12 3.81 11.86 11.86 0 01-8.6-4.36 4.18 4.18 0 001.29 5.58 4.16 4.16 0 01-1.9-.53v.05a4.18 4.18 0 003.35 4.1 4.2 4.2 0 01-1.9.07 4.18 4.18 0 003.9 2.9 8.38 8.38 0 01-5.18 1.79A8.5 8.5 0 012 19.5a11.84 11.84 0 006.42 1.88c7.71 0 11.93-6.39 11.93-11.92 0-.18 0-.36-.01-.53A8.5 8.5 0 0022 5.5z" fill="#111827"/>
            </svg>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => (
            <a key={i} className={`nav-item${i === 0 ? ' active' : ''}`} href="#">
              <span className="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{item.icon}</svg></span>
              <span>{item.label}</span>
            </a>
          ))}
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
                <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="content">
        <section className="topnav">
          <div className="tabs-wrap">
            <div className="page-tabs" ref={tabsRef}>
              {TABS.map((t, i) => (
                <button
                  key={i}
                  className={`tab${activeTab === i ? ' active' : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="tab-controls">
              <button
                className="tab-toggle"
                disabled={!canPrev}
                aria-label="Scroll tabs left"
                onClick={() => tabsRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                className="tab-toggle"
                disabled={!canNext}
                aria-label="Scroll tabs right"
                onClick={() => tabsRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </section>

        <section className="feed">
          {/* Composer */}
          <article className="card composer-card">
            <div className="composer-row">
              <div className="avatar">{initials}</div>
              <textarea placeholder="What is happening?"></textarea>
            </div>
            <div className="composer-actions">
              <div className="composer-icons">
                {[
                  ['Add photo', <><path d="M4.75 6.25h14.5v11.5H4.75z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M4.75 9.25l4.5 5.5 3.75-4.5 5.25 6.75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>],
                  ['Add video', <><path d="M5.5 5.5h13v13h-13z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 8.5l7 4.5-7 4.5V8.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></>],
                  ['Add emoji', <><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 10.5h.01M15 10.5h.01M8.5 15.5c1.25 1.25 3.25 1.25 4.5 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></>],
                  ['Add location', <><path d="M12 21s-6-5.5-6-10a6 6 0 0112 0c0 4.5-6 10-6 10z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10.5" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7"/></>],
                ].map(([label, icon], i) => (
                  <button key={i} className="icon-button" aria-label={label}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
                  </button>
                ))}
              </div>
              <button className="primary-button">Post</button>
            </div>
          </article>

          <article className="card count-card">
            <div className="count-label">Show 35 posts</div>
          </article>

          {POSTS.slice(0, visibleCount).map((p, i) => (
            <PostCard key={i} {...p} />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="feed-sentinel">
            {loadingMore && <span className="feed-loading">Loading more posts…</span>}
            {!loadingMore && visibleCount >= POSTS.length && (
              <span className="feed-loading">You're all caught up</span>
            )}
          </div>
        </section>
      </main>

      {/* Right aside */}
      <aside className="aside-right">
        <div className="search-box">
          <input type="search" placeholder="Search" />
          <span className="search-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M16.5 16.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </span>
        </div>

        <div className="card explore-card">
          <div className="section-heading">
            <div className="section-title">Explore</div>
            <div className="section-status">Beta</div>
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
          <button className="show-more">+ Show More</button>
        </div>

        <div className="card follow-card">
          <div className="section-title">Who to follow</div>
          {FOLLOW.map((f, i) => (
            <div key={i} className="follow-person">
              <div className="follow-person-info">
                <div className="avatar small">{f.initials}</div>
                <div className="follow-person-text">
                  <div className="follow-name">{f.name}</div>
                  <div className="follow-meta">{f.handle}</div>
                </div>
              </div>
              <button className="follow-button">Follow</button>
            </div>
          ))}
          <button className="show-more">+ Show More</button>
        </div>
      </aside>
    </div>
  )
}

function PostCard({ initials, author, handle, time, text, comments, reposts, likes, views }) {
  return (
    <article className="card post-card">
      <div className="post-header">
        <div className="row gap-sm">
          <div className="avatar">{initials}</div>
          <div>
            <div className="post-author">{author}</div>
            <div className="post-meta">{handle} · {time}</div>
          </div>
        </div>
        <button className="more-button" aria-label="More options">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="19" cy="12" r="1.25"/></svg>
        </button>
      </div>
      <p className="post-text">{text}</p>
      <div className="post-actions">
        <button className="action-button" aria-label="Comments">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.75h12a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H10.5l-4.5 3v-3H6a1.5 1.5 0 01-1.5-1.5v-7.5A1.5 1.5 0 016 5.75z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {comments}
        </button>
        <button className="action-button" aria-label="Repost">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4.75h-4.5a4.25 4.25 0 00-4.25 4.25v1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.5 7.75l-3.25 3.25 3.25 3.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 19.25h4.5a4.25 4.25 0 004.25-4.25v-1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.5 16.25l3.25-3.25-3.25-3.25" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {reposts}
        </button>
        <button className="action-button" aria-label="Likes">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.25s-6.75-4.27-9-8.25C1.5 9.82 4.1 6 8 6c1.63 0 3.3.8 4 2 .7-1.2 2.37-2 4-2 3.9 0 6.5 3.82 5 6.75-2.25 3.98-9 8.25-9 8.25z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {likes}
        </button>
        <button className="action-button" aria-label="Views">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>
          {views}
        </button>
      </div>
    </article>
  )
}
