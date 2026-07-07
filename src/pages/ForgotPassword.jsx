import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './AuthPanel.css'

export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const email = e.target.email.value.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setServerError('')
    setSubmitting(true)

    try {
      const data = await api.post('/auth/forgot-password', { email })
      setSuccessMessage(data.message)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="forgot-shell">
        {/* Left brand panel */}
        <div className="login-panel-left">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 5.5a8.5 8.5 0 01-2.4.66 4.2 4.2 0 001.85-2.32 8.4 8.4 0 01-2.66 1.02 4.18 4.18 0 00-7.12 3.81 11.86 11.86 0 01-8.6-4.36 4.18 4.18 0 001.29 5.58 4.16 4.16 0 01-1.9-.53v.05a4.18 4.18 0 003.35 4.1 4.2 4.2 0 01-1.9.07 4.18 4.18 0 003.9 2.9 8.38 8.38 0 01-5.18 1.79A8.5 8.5 0 012 19.5a11.84 11.84 0 006.42 1.88c7.71 0 11.93-6.39 11.93-11.92 0-.18 0-.36-.01-.53A8.5 8.5 0 0022 5.5z" fill="#ffffff"/>
            </svg>
          </div>
          <div className="auth-panel-tagline">
            <h2>Reset your password</h2>
            <p>We'll send instructions to<br />your email address.</p>
          </div>
          <div className="auth-panel-dots">
            <span></span>
            <span></span>
            <span className="active"></span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-panel-right">
          <div className="auth-heading">
            <h1>Forgot password?</h1>
            <p>Enter your email and we'll send you a reset link.</p>
          </div>

          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          {successMessage ? (
            <div className="success-message" role="status">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="9" stroke="#22c55e" strokeWidth="1.8"/>
                <path d="M9 12l2 2 4-4" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {successMessage}
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="email">Email address</label>
                <input
                  className={`field-input${emailError ? ' error' : ''}`}
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                {emailError && <span className="field-error">{emailError}</span>}
              </div>

              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="auth-footer">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
