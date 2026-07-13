const express = require('express')
const jwt = require('jsonwebtoken')
const pool = require('../db')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// ─── GET /api/messages/conversations ─────────────────────────────────────────
// List all conversations for the logged-in user, with the other participant
// and the last message preview.
router.get('/conversations', requireAuth, async (req, res) => {
  const userId = req.user.userId
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.created_at,
         u.id          AS other_user_id,
         u.username    AS other_username,
         u.first_name  AS other_first_name,
         u.last_name   AS other_last_name,
         m.body        AS last_message_body,
         m.sender_id   AS last_message_sender_id,
         m.created_at  AS last_message_at
       FROM conversations c
       JOIN conversation_participants cp  ON cp.conversation_id = c.id AND cp.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id <> $1
       JOIN users u ON u.id = cp2.user_id
       LEFT JOIN LATERAL (
         SELECT body, sender_id, created_at
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
      [userId]
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('List conversations error:', err)
    return res.status(500).json({ error: 'Failed to load conversations.' })
  }
})

// ─── POST /api/messages/conversations ────────────────────────────────────────
// Find or create a conversation with another user.
router.post('/conversations', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const { username } = req.body

  if (!username) return res.status(400).json({ error: 'username is required.' })

  try {
    const targetRes = await pool.query(
      'SELECT id, username, first_name, last_name FROM users WHERE username = $1 LIMIT 1',
      [username.toLowerCase()]
    )
    if (targetRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    const other = targetRes.rows[0]

    if (other.id === userId) return res.status(400).json({ error: 'Cannot message yourself.' })

    // Check for existing conversation between these two users
    const existing = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
       LIMIT 1`,
      [userId, other.id]
    )

    if (existing.rowCount > 0) {
      return res.json({ id: existing.rows[0].id, other_user_id: other.id, other_username: other.username, other_first_name: other.first_name, other_last_name: other.last_name })
    }

    // Create new conversation
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const convRes = await client.query('INSERT INTO conversations DEFAULT VALUES RETURNING id')
      const convId = convRes.rows[0].id
      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [convId, userId, other.id]
      )
      await client.query('COMMIT')
      return res.status(201).json({ id: convId, other_user_id: other.id, other_username: other.username, other_first_name: other.first_name, other_last_name: other.last_name })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Create conversation error:', err)
    return res.status(500).json({ error: 'Failed to create conversation.' })
  }
})

// ─── GET /api/messages/conversations/:id ─────────────────────────────────────
// Get messages in a conversation (paginated, newest last).
router.get('/conversations/:id', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const convId = parseInt(req.params.id, 10)

  try {
    // Verify the user is a participant
    const access = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    )
    if (access.rowCount === 0) return res.status(403).json({ error: 'Access denied.' })

    const msgs = await pool.query(
      `SELECT
         m.id,
         m.body,
         m.sender_id,
         m.reply_to_id,
         m.created_at,
         u.username    AS sender_username,
         u.first_name  AS sender_first_name,
         u.last_name   AS sender_last_name,
         rm.body       AS reply_to_body,
         ru.username   AS reply_to_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       LEFT JOIN users ru ON ru.id = rm.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [convId]
    )

    // Also get the other participant's info
    const other = await pool.query(
      `SELECT u.id, u.username, u.first_name, u.last_name
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1 AND cp.user_id <> $2
       LIMIT 1`,
      [convId, userId]
    )

    return res.json({ messages: msgs.rows, other: other.rows[0] || null })
  } catch (err) {
    console.error('Get messages error:', err)
    return res.status(500).json({ error: 'Failed to load messages.' })
  }
})

// ─── POST /api/messages/conversations/:id ────────────────────────────────────
// Send a message in a conversation.
router.post('/conversations/:id', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const convId = parseInt(req.params.id, 10)
  const { body, reply_to_id } = req.body

  if (!body || !body.trim()) return res.status(400).json({ error: 'Message body is required.' })
  if (body.length > 10000) return res.status(400).json({ error: 'Message too long.' })

  try {
    // Verify the user is a participant
    const access = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    )
    if (access.rowCount === 0) return res.status(403).json({ error: 'Access denied.' })

    // Validate reply_to_id belongs to this conversation
    if (reply_to_id) {
      const replyCheck = await pool.query(
        'SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2',
        [reply_to_id, convId]
      )
      if (replyCheck.rowCount === 0) return res.status(400).json({ error: 'Invalid reply target.' })
    }

    const msgRes = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, body, reply_to_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, sender_id, reply_to_id, created_at`,
      [convId, userId, body.trim(), reply_to_id || null]
    )

    const msg = msgRes.rows[0]

    // Fetch sender info and reply context
    const full = await pool.query(
      `SELECT
         m.id, m.body, m.sender_id, m.reply_to_id, m.created_at,
         u.username    AS sender_username,
         u.first_name  AS sender_first_name,
         u.last_name   AS sender_last_name,
         rm.body       AS reply_to_body,
         ru.username   AS reply_to_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages rm ON rm.id = m.reply_to_id
       LEFT JOIN users ru ON ru.id = rm.sender_id
       WHERE m.id = $1`,
      [msg.id]
    )

    return res.status(201).json(full.rows[0])
  } catch (err) {
    console.error('Send message error:', err)
    return res.status(500).json({ error: 'Failed to send message.' })
  }
})

// ─── GET /api/messages/users/search ──────────────────────────────────────────
// Search users to start a new conversation.
router.get('/users/search', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const q = (req.query.q || '').trim().toLowerCase()

  if (!q || q.length < 1) return res.json([])

  try {
    const result = await pool.query(
      `SELECT id, username, first_name, last_name
       FROM users
       WHERE id <> $1
         AND (username ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)
       ORDER BY username
       LIMIT 10`,
      [userId, `%${q}%`]
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('User search error:', err)
    return res.status(500).json({ error: 'Search failed.' })
  }
})

module.exports = router
