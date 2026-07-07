import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import './AuthPanel.css'

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')

  const strength = calcStrength(pwValue)

  function validate(fields) {
    const e = {}
    if (!fields.firstName.trim()) e.firstName = 'First name is required.'
    if (!fields.lastName.trim()) e.lastName = 'Last name is required.'
    if (!fields.username.trim()) e.username = 'Username is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = 'Please enter a valid email address.'
    if (fields.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (fields.password !== fields.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    const fields = {
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      username: form.username.value,
      email: form.email.value,
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
    }

    const validationErrors = validate(fields)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setServerError('')
    setSubmitting(true)

    try {
      const { token, user } = await api.post('/auth/register', {
        firstName: fields.firstName,
        lastName: fields.lastName,
        username: fields.username,
        email: fields.email,
        password: fields.password,
      })
      login(token, user)
      navigate('/feed')
    } catch (err) {
      if (err.field) {
        setErrors({ [err.field]: err.message })
      } else {
        setServerError(err.message)
      }
    } finally {
      setSubmitting(false)
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

          {serverError && <div className="server-error" role="alert">{serverError}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label" htmlFor="firstName">First name</label>
                <input className={`field-input${errors.firstName ? ' error' : ''}`} id="firstName" type="text" name="firstName" placeholder="Jane" autoComplete="given-name" required />
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="lastName">Last name</label>
                <input className={`field-input${errors.lastName ? ' error' : ''}`} id="lastName" type="text" name="lastName" placeholder="Doe" autoComplete="family-name" required />
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="username">Username</label>
              <input className={`field-input${errors.username ? ' error' : ''}`} id="username" type="text" name="username" placeholder="@janedoe" autoComplete="username" required />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="email">Email address</label>
              <input className={`field-input${errors.email ? ' error' : ''}`} id="email" type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input${errors.password ? ' error' : ''}`}
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
              {errors.password && <span className="field-error">{errors.password}</span>}
              <StrengthBar score={strength.score} label={strength.label} color={strength.color} />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="field-input-wrap">
                <input
                  className={`field-input${errors.confirmPassword ? ' error' : ''}`}
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
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>

            <div className="terms-row">
              <input type="checkbox" id="terms" name="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>, including <a href="#">Cookie Use</a>.
              </label>
            </div>

            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
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


