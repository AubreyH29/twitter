import { useState } from 'react'
import { Link } from 'react-router-dom'
import './AuthPanel.css'

export default function Signup() {
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [emailError, setEmailError] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const strength = calcStrength(pwValue)

  function handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    let valid = true

    const email = form.email.value
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      valid = false
    } else {
      setEmailError('')
    }

    const pw = form.password.value
    const cpw = form.confirmPassword.value
    if (pw !== cpw) {
      setConfirmError('Passwords do not match.')
      valid = false
    } else {
      setConfirmError('')
    }

    if (valid) {
      // navigate('/feed') after real auth
    }
  }

  return (
    <div className="auth-bg">
      <div className="signup-shell">
        {/* Left brand panel */}
        <div className="signup-panel-left">
          <div className="signup-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 5.5a8.5 8.5 0 01-2.4.66 4.2 4.2 0 001.85-2.32 8.4 8.4 0 01-2.66 1.02 4.18 4.18 0 00-7.12 3.81 11.86 11.86 0 01-8.6-4.36 4.18 4.18 0 001.29 5.58 4.16 4.16 0 01-1.9-.53v.05a4.18 4.18 0 003.35 4.1 4.2 4.2 0 01-1.9.07 4.18 4.18 0 003.9 2.9 8.38 8.38 0 01-5.18 1.79A8.5 8.5 0 012 19.5a11.84 11.84 0 006.42 1.88c7.71 0 11.93-6.39 11.93-11.92 0-.18 0-.36-.01-.53A8.5 8.5 0 0022 5.5z" fill="#ffffff"/>
            </svg>
          </div>
          <div className="auth-panel-tagline">
            <h2>Join X today</h2>
            <p>Connect with people, share ideas,<br />and stay in the know.</p>
          </div>
          <div className="signup-features">
            {[
              'Follow topics that matter to you',
              'Join conversations in real time',
              'Like and share what you love',
            ].map((text, i) => (
              <div className="signup-feature-item" key={i}>
                <div className="feature-dot-circle">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="#93c5fd" strokeWidth="1.8"/>
                    <path d="M9 12l2 2 4-4" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <div className="signup-panel-right">
          <div className="auth-heading">
            <h1>Create account</h1>
            <p>It's free and only takes a minute.</p>
          </div>

          <div className="oauth-group">
            <button className="oauth-button" type="button">
              <GoogleIcon /> Sign up with Google
            </button>
            <button className="oauth-button" type="button">
              <AppleIcon /> Sign up with Apple
            </button>
          </div>

          <div className="divider">or</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="firstName">First name</label>
                <input className="field-input" id="firstName" type="text" name="firstName" placeholder="Jane" autoComplete="given-name" required />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="lastName">Last name</label>
                <input className="field-input" id="lastName" type="text" name="lastName" placeholder="Doe" autoComplete="family-name" required />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="username">Username</label>
              <input className="field-input" id="username" type="text" name="username" placeholder="@janedoe" autoComplete="username" required />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="email">Email address</label>
              <input className={`field-input${emailError ? ' error' : ''}`} id="email" type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              {emailError && <span className="field-error">{emailError}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-input-wrap">
                <input
                  className="field-input"
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  value={pwValue}
                  onChange={e => setPwValue(e.target.value)}
                />
                <button className="field-toggle-btn" type="button" aria-label="Toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <StrengthBar score={strength.score} label={strength.label} color={strength.color} />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input${confirmError ? ' error' : ''}`}
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  required
                />
                <button className="field-toggle-btn" type="button" aria-label="Toggle" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmError && <span className="field-error">{confirmError}</span>}
            </div>

            <div className="terms-row">
              <input type="checkbox" id="terms" name="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>, including <a href="#">Cookie Use</a>.
              </label>
            </div>

            <button className="submit-btn" type="submit">Create account</button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function calcStrength(value) {
  if (!value) return { score: 0, label: 'Enter a password', color: '#9ca3af' }
  let score = 0
  if (value.length >= 8) score++
  if (/[A-Z]/.test(value)) score++
  if (/[0-9]/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++
  const labels = ['Too weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e']
  return { score, label: labels[score - 1] || 'Too weak', color: colors[score - 1] || '#ef4444' }
}

function StrengthBar({ score, label, color }) {
  const classMap = ['filled-weak', 'filled-fair', 'filled-good', 'filled-strong']
  return (
    <div className="password-strength">
      <div className="strength-bar">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={i < score ? classMap[score - 1] : ''}></span>
        ))}
      </div>
      <span className="strength-label" style={{ color }}>{label}</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M13.53 9.49c-.02-2.04 1.67-3.02 1.74-3.07-.95-1.38-2.42-1.57-2.94-1.59-1.25-.13-2.45.74-3.08.74-.64 0-1.62-.72-2.67-.7-1.37.02-2.63.8-3.33 2.02-1.43 2.47-.37 6.12 1.02 8.12.68.98 1.48 2.08 2.54 2.04 1.02-.04 1.4-.66 2.63-.66 1.22 0 1.57.66 2.64.64 1.1-.02 1.79-1 2.46-1.98.78-1.13 1.1-2.23 1.12-2.29-.02-.01-2.14-.82-2.13-3.27z" fill="#111827"/>
      <path d="M11.52 3.18c.56-.68.94-1.63.84-2.58-.81.04-1.8.54-2.38 1.21-.52.6-.98 1.57-.86 2.49.9.07 1.82-.46 2.4-1.12z" fill="#111827"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M1.5 12s4.5-7.5 10.5-7.5S22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M10.58 10.58A3 3 0 0013.42 13.42M7.37 7.37A9.77 9.77 0 001.5 12s4.5 7.5 10.5 7.5c1.87 0 3.6-.52 5.1-1.4M17.1 17.1A9.77 9.77 0 0022.5 12S18 4.5 12 4.5c-.73 0-1.44.08-2.1.23" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
