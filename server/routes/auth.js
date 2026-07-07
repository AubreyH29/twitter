const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const pool = require('../db')

const router = express.Router()

const SALT_ROUNDS = 12
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '7d'

// ─── helpers ────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function safeUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    createdAt: row.created_at,
  }
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body

  // Basic validation
  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const usernameClean = username.replace(/^@/, '').trim()
  if (!/^[a-zA-Z0-9_]{1,30}$/.test(usernameClean)) {
    return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores (max 30 chars).' })
  }

  try {
    // Check uniqueness
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1',
      [email.toLowerCase(), usernameClean.toLowerCase()]
    )
    if (existing.rowCount > 0) {
      // Determine which field conflicts
      const row = await pool.query(
        'SELECT email, username FROM users WHERE email = $1 OR username = $2 LIMIT 1',
        [email.toLowerCase(), usernameClean.toLowerCase()]
      )
      const taken = row.rows[0]
      if (taken.email === email.toLowerCase()) {
        return res.status(409).json({ field: 'email', error: 'An account with this email already exists.' })
      }
      return res.status(409).json({ field: 'username', error: 'This username is already taken.' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [firstName.trim(), lastName.trim(), usernameClean.toLowerCase(), email.toLowerCase(), passwordHash]
    )

    const user = safeUser(result.rows[0])
    const token = signToken({ userId: user.id })

    return res.status(201).json({ token, user })
  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
  }
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' })
  }

  try {
    const identifierLower = identifier.replace(/^@/, '').trim().toLowerCase()
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1',
      [identifierLower]
    )

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email/username or password.' })
    }

    const row = result.rows[0]
    const match = await bcrypt.compare(password, row.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid email/username or password.' })
    }

    const user = safeUser(row)
    const token = signToken({ userId: user.id })

    return res.status(200).json({ token, user })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
  }
})

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
// Generates a reset token and stores it in the DB.
// Email delivery is intentionally skipped for now — token is returned in the
// response so you can wire it to an email provider later.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' })
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    )

    // Always respond with success to prevent email enumeration
    if (result.rowCount === 0) {
      return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, result.rows[0].id]
    )

    // TODO: Send email with reset link containing the token
    // The reset link would look like: https://yoursite.com/reset-password?token=<token>

    return res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
  }
})

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [payload.userId])
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'User not found.' })
    }
    return res.status(200).json({ user: safeUser(result.rows[0]) })
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
})

module.exports = router
