import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-shell">
      {/* Left column */}
      <section className="hero-left">
        <svg className="x-logo" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" aria-label="Twitter" role="img">
          <path d="M23.954 4.569a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 9.917 9.917 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.691 8.094 4.066 6.13 1.64 3.161a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.061a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z"/>
        </svg>

        <div className="avatar-group">
          <div className="avatar-bubble ab1" aria-hidden="true">JW</div>
          <div className="avatar-bubble ab2" aria-hidden="true">SR</div>
          <div className="avatar-bubble ab3" aria-hidden="true">ML</div>
          <span className="avatar-group-label">500M+ people worldwide</span>
        </div>

        <h1 className="hero-headline">See what's happening in the world right now.</h1>

        <p className="hero-sub">
          Join the conversation. Follow your interests, share your thoughts,
          and stay connected with breaking news, trending topics, and the
          people who matter most to you.
        </p>

        <div className="cta-row">
          <Link to="/signup" className="btn-primary">Create account</Link>
          <Link to="/login" className="btn-ghost">Sign in</Link>
        </div>

        <p className="social-proof">Join over 500 million people already on X. No credit card required.</p>

        <div className="feature-tags">
          <span className="feature-tag"><span className="feature-dot dot-blue"></span>Trending Now</span>
          <span className="feature-tag"><span className="feature-dot dot-green"></span>Breaking News</span>
          <span className="feature-tag"><span className="feature-dot dot-yellow"></span>Real-time</span>
          <span className="feature-tag"><span className="feature-dot dot-pink"></span>Global</span>
        </div>
      </section>

      {/* Right column: phone mockup */}
      <section className="hero-right" aria-hidden="true">
        <div className="phone-wrap">
          {/* Floating card top right */}
          <div className="floating-card fc-top">
            <div className="fc-icon fc-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="fc-label">
              <div className="fc-title">Verified Accounts</div>
              <div className="fc-sub">Trusted sources only</div>
            </div>
          </div>

          {/* Phone frame */}
          <div className="phone-frame">
            <div className="phone-status">
              <span className="phone-time">9:41</span>
              <div className="phone-icons">
                <div className="phone-icon-dot"></div>
                <div className="phone-icon-dot"></div>
              </div>
            </div>

            {[
              { initials: 'JW', color: 'ta1', name: 'James Wilson', handle: '@jameswilson', text: 'Just hit 10K followers — thank you all for the incredible support!', tag: '#Trending' },
              { initials: 'SR', color: 'ta2', name: 'Sarah Rivera', handle: '@sarahrivera', text: 'Markets hit an all-time high amid a record-breaking tech surge.', tag: '#News' },
              { initials: 'ML', color: 'ta3', name: 'Marcus Lee', handle: '@marcuslee', text: 'The future of AI is here — and it\'s more exciting than we imagined.', tag: '#AI' },
              { initials: 'EP', color: 'ta4', name: 'Elena Park', handle: '@elenapark', text: 'Live coverage starting in 5 minutes. Don\'t miss it!', tag: '#Live' },
            ].map((t, i) => (
              <div className="tweet-card" key={i}>
                <div className={`tweet-avi ${t.color}`}>{t.initials}</div>
                <div className="tweet-body">
                  <div className="tweet-row">
                    <span className="tweet-name">{t.name}</span>
                    <span className="tweet-handle">{t.handle}</span>
                  </div>
                  <div className="tweet-text">{t.text}</div>
                </div>
                <span className="tweet-tag">{t.tag}</span>
              </div>
            ))}
          </div>

          {/* Floating card bottom left */}
          <div className="floating-card fc-bottom">
            <div className="fc-icon fc-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="fc-label">
              <div className="fc-title">Real-time Feed</div>
              <div className="fc-sub">Updates every second</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
