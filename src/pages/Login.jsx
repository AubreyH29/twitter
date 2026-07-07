import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import './AuthPanel.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    const identifier = form.identifier.value.trim()
    const password = form.password.value

    const e2 = {}
    if (!identifier) e2.identifier = 'Email or username is required.'
    if (!password) e2.password = 'Password is required.'
    if (Object.keys(e2).length > 0) { setErrors(e2); return }

    setErrors({})
    setServerError('')
    setSubmitting(true)

    try {
      const { token, user } = await api.post('/auth/login', { identifier, password })
      login(token, user)
      navigate('/feed')
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="login-shell">
        {/* Left brand panel */}
        <div className="login-panel-left">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 5.5a8.5 8.5 0 01-2.4.66 4.2 4.2 0 001.85-2.32 8.4 8.4 0 01-2.66 1.02 4.18 4.18 0 00-7.12 3.81 11.86 11.86 0 01-8.6-4.36 4.18 4.18 0 001.29 5.58 4.16 4.16 0 01-1.9-.53v.05a4.18 4.18 0 003.35 4.1 4.2 4.2 0 01-1.9.07 4.18 4.18 0 003.9 2.9 8.38 8.38 0 01-5.18 1.79A8.5 8.5 0 012 19.5a11.84 11.84 0 006.42 1.88c7.71 0 11.93-6.39 11.93-11.92 0-.18 0-.36-.01-.53A8.5 8.5 0 0022 5.5z" fill="#ffffff"/>
            </svg>
          </div>
          <div className="auth-panel-tagline">
            <h2>Welcome back to X</h2>
            <p>See what's happening in the world<br />right now.</p>
          </div>
          <div className="auth-panel-dots">
            <span className="active"></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-panel-right">
          <div className="auth-heading">
            <h1>Sign in</h1>
            <p>Enter your credentials to continue.</p>
          </div>

          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="identifier">Email or username</label>
              <input
                className={`field-input${errors.identifier ? ' error' : ''}`}
                id="identifier"
                type="text"
                name="identifier"
                placeholder="you@example.com or @handle"
                autoComplete="username"
                required
              />
              {errors.identifier && <span className="field-error">{errors.identifier}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input${errors.password ? ' error' : ''}`}
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  className="field-toggle-btn"
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
              <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>
            </div>

            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
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


