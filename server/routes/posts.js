const express = require('express')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const pool = require('../db')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET

// ─── Upload storage ───────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = crypto.randomBytes(16).toString('hex')
    cb(null, `${name}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
  cb(null, allowed.includes(file.mimetype))
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 4 },
})

// ─── auth middleware ──────────────────────────────────────────────────────────
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

// ─── GET /api/posts?page=1 ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit
  const currentUserId = req.user.userId

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $3) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $3) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $3) AS bookmarked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, currentUserId]
    )
    return res.json({ posts: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get posts error:', err)
    return res.status(500).json({ error: 'Failed to load posts.' })
  }
})

// ─── GET /api/posts/user/:username ───────────────────────────────────────────
router.get('/user/:username', requireAuth, async (req, res) => {
  const { username } = req.params
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit
  const currentUserId = req.user.userId

  try {
    const userRes = await pool.query(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username.toLowerCase()]
    )
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }
    const profileUser = userRes.rows[0]

    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $4) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $4) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $4) AS bookmarked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileUser.id, limit, offset, currentUserId]
    )

    const followCounts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM follows WHERE following_id = $1)::int AS follower_count,
         (SELECT COUNT(*) FROM follows WHERE follower_id  = $1)::int AS following_count,
         EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) AS is_followed_by_me`,
      [profileUser.id, currentUserId]
    )
    const fc = followCounts.rows[0]

    return res.json({
      posts: result.rows,
      page,
      hasMore: result.rows.length === limit,
      profile: {
        id: profileUser.id,
        firstName: profileUser.first_name,
        lastName: profileUser.last_name,
        username: profileUser.username,
        bio: profileUser.bio || '',
        createdAt: profileUser.created_at,
        follower_count: fc.follower_count,
        following_count: fc.following_count,
        is_followed_by_me: fc.is_followed_by_me,
      }
    })
  } catch (err) {
    console.error('Get user posts error:', err)
    return res.status(500).json({ error: 'Failed to load profile.' })
  }
})

// ─── POST /api/posts ──────────────────────────────────────────────────────────
router.post('/', requireAuth, upload.array('media', 4), async (req, res) => {
  const body     = (req.body.body || '').trim()
  const location = (req.body.location || '').trim().slice(0, 100)
  const mediaUrls = (req.files || []).map(f => `/api/uploads/${f.filename}`)

  if (!body && mediaUrls.length === 0) {
    return res.status(400).json({ error: 'Post must have text or media.' })
  }
  if (body.length > 280) {
    return res.status(400).json({ error: 'Post cannot exceed 280 characters.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO posts (user_id, body, media_urls, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, body, media_urls, location, created_at`,
      [req.user.userId, body, mediaUrls, location]
    )
    const post = result.rows[0]

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId])
    const u = userRes.rows[0]

    return res.status(201).json({
      post: {
        id: post.id,
        body: post.body,
        media_urls: post.media_urls || [],
        location: post.location || '',
        created_at: post.created_at,
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        like_count: 0,
        repost_count: 0,
        liked_by_me: false,
        reposted_by_me: false,
        bookmarked_by_me: false,
      }
    })
  } catch (err) {
    console.error('Create post error:', err)
    return res.status(500).json({ error: 'Failed to create post.' })
  }
})

module.exports = router

