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
      `WITH timeline AS (
         SELECT p.id AS post_id, p.created_at AS activity_at, NULL::integer AS reposted_by_id
         FROM posts p
         WHERE p.reply_to_id IS NULL
           AND (p.user_id = $3
            OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $3))
         UNION ALL
         SELECT r.post_id, r.created_at AS activity_at, r.user_id AS reposted_by_id
         FROM reposts r
         JOIN posts rp ON rp.id = r.post_id
         WHERE rp.reply_to_id IS NULL
           AND (r.user_id = $3
            OR r.user_id IN (SELECT following_id FROM follows WHERE follower_id = $3))
       )
       SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at, p.quote_post_id, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp2 WHERE rp2.reply_to_id = p.id AND rp2.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $3) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $3) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $3) AS bookmarked_by_me,
         t.activity_at, t.reposted_by_id, ru.first_name AS reposted_by_first_name,
         ru.last_name AS reposted_by_last_name, ru.username AS reposted_by_username,
         qp.body AS quoted_body, qp.media_urls AS quoted_media_urls, qp.created_at AS quoted_created_at,
         qu.id AS quoted_user_id, qu.first_name AS quoted_first_name, qu.last_name AS quoted_last_name, qu.username AS quoted_username
       FROM timeline t
       JOIN posts p ON p.id = t.post_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN users ru ON ru.id = t.reposted_by_id
       LEFT JOIN posts qp ON qp.id = p.quote_post_id
       LEFT JOIN users qu ON qu.id = qp.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.deleted_at IS NULL AND p.reply_to_id IS NULL
       GROUP BY p.id, u.id, t.activity_at, t.reposted_by_id, ru.id, qp.id, qu.id
       ORDER BY t.activity_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset, currentUserId]
    )
    return res.json({ posts: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get posts error:', err)
    return res.status(500).json({ error: 'Failed to load posts.' })
  }
})


// ─── GET /api/posts/search?q=term&page=1 ─────────────────────────────────────
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim()
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit
  const currentUserId = req.user.userId

  if (!q) return res.json({ posts: [], page, hasMore: false })

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at, p.quote_post_id, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $4) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $4) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $4) AS bookmarked_by_me,
         qp.body AS quoted_body, qp.media_urls AS quoted_media_urls, qp.created_at AS quoted_created_at,
         qu.id AS quoted_user_id, qu.first_name AS quoted_first_name, qu.last_name AS quoted_last_name, qu.username AS quoted_username
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN posts qp ON qp.id = p.quote_post_id
       LEFT JOIN users qu ON qu.id = qp.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.deleted_at IS NULL
         AND p.reply_to_id IS NULL
         AND (p.body ILIKE $1 OR u.username ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)
       GROUP BY p.id, u.id, qp.id, qu.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${q}%`, limit, offset, currentUserId]
    )
    return res.json({ posts: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Search posts error:', err)
    return res.status(500).json({ error: 'Failed to search posts.' })
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
         p.id, p.body, p.media_urls, p.location, p.created_at, p.quote_post_id, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $4) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $4) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $4) AS bookmarked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.user_id = $1 AND p.deleted_at IS NULL AND p.reply_to_id IS NULL
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


// ─── GET /api/posts/user/:username/replies ───────────────────────────────────
router.get('/user/:username/replies', requireAuth, async (req, res) => {
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
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    const profileUser = userRes.rows[0]

    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at, p.quote_post_id, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $4) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $4) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $4) AS bookmarked_by_me,
         pu.username AS reply_to_username, pu.first_name AS reply_to_first_name, pu.last_name AS reply_to_last_name,
         pp.body AS reply_to_body
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN posts pp ON pp.id = p.reply_to_id
       LEFT JOIN users pu ON pu.id = pp.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.user_id = $1 AND p.deleted_at IS NULL AND p.reply_to_id IS NOT NULL
       GROUP BY p.id, u.id, pu.id, pp.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileUser.id, limit, offset, currentUserId]
    )

    return res.json({ replies: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get user replies error:', err)
    return res.status(500).json({ error: 'Failed to load replies.' })
  }
})

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.id, 10)
  if (!postId) return res.status(400).json({ error: 'Invalid post id.' })
  const currentUserId = req.user.userId

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at, p.quote_post_id, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $2) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $2) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $2) AS bookmarked_by_me,
         pu.username AS reply_to_username, pu.first_name AS reply_to_first_name, pu.last_name AS reply_to_last_name,
         qp.body AS quoted_body, qp.media_urls AS quoted_media_urls, qp.created_at AS quoted_created_at,
         qu.id AS quoted_user_id, qu.first_name AS quoted_first_name, qu.last_name AS quoted_last_name, qu.username AS quoted_username
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN posts pp ON pp.id = p.reply_to_id
       LEFT JOIN users pu ON pu.id = pp.user_id
       LEFT JOIN posts qp ON qp.id = p.quote_post_id
       LEFT JOIN users qu ON qu.id = qp.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id, u.id, pu.id, pp.id, qp.id, qu.id`,
      [postId, currentUserId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Post not found.' })

    const post = result.rows[0]
    let parentPost = null

    if (post.reply_to_id) {
      const parentRes = await pool.query(
        `SELECT
           p.id, p.body, p.media_urls, p.location, p.created_at, p.reply_to_id,
           u.id AS user_id, u.first_name, u.last_name, u.username,
           COUNT(DISTINCT l.user_id)::int AS like_count,
           COUNT(DISTINCT r.user_id)::int AS repost_count,
           (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
           EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) AS liked_by_me,
           EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $2) AS reposted_by_me,
           EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $2) AS bookmarked_by_me,
           pu.username AS reply_to_username
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN posts pp ON pp.id = p.reply_to_id
         LEFT JOIN users pu ON pu.id = pp.user_id
         LEFT JOIN likes l ON l.post_id = p.id
         LEFT JOIN reposts r ON r.post_id = p.id
         WHERE p.id = $1 AND p.deleted_at IS NULL
         GROUP BY p.id, u.id, pu.id`,
        [post.reply_to_id, currentUserId]
      )
      parentPost = parentRes.rows[0] || null
    }

    return res.json({ post, parentPost })
  } catch (err) {
    console.error('Get post error:', err)
    return res.status(500).json({ error: 'Failed to load post.' })
  }
})

// ─── GET /api/posts/:id/replies ───────────────────────────────────────────────
router.get('/:id/replies', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.id, 10)
  if (!postId) return res.status(400).json({ error: 'Invalid post id.' })
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit
  const currentUserId = req.user.userId

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at, p.reply_to_id,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         (SELECT COUNT(*) FROM posts rp WHERE rp.reply_to_id = p.id AND rp.deleted_at IS NULL)::int AS reply_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $3) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $3) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $3) AS bookmarked_by_me,
         $2::integer AS reply_to_id_val
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE p.reply_to_id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id, u.id
       ORDER BY p.created_at ASC
       LIMIT $4 OFFSET $5`,
      [postId, postId, currentUserId, limit, offset]
    )
    return res.json({ replies: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get replies error:', err)
    return res.status(500).json({ error: 'Failed to load replies.' })
  }
})

// ─── POST /api/posts ──────────────────────────────────────────────────────────
router.post('/', requireAuth, upload.array('media', 4), async (req, res) => {
  const body     = (req.body.body || '').trim()
  const location = (req.body.location || '').trim().slice(0, 100)
  const mediaUrls = (req.files || []).map(f => `/api/uploads/${f.filename}`)
  const quotePostId = req.body.quote_post_id ? parseInt(req.body.quote_post_id) : null
  const replyToId   = req.body.reply_to_id   ? parseInt(req.body.reply_to_id)   : null

  if (!body && mediaUrls.length === 0 && !quotePostId) {
    return res.status(400).json({ error: 'Post must have text or media.' })
  }
  if (quotePostId !== null && isNaN(quotePostId)) {
    return res.status(400).json({ error: 'Invalid quoted post ID.' })
  }
  if (replyToId !== null && isNaN(replyToId)) {
    return res.status(400).json({ error: 'Invalid reply_to_id.' })
  }
  if (body.length > 280) {
    return res.status(400).json({ error: 'Post cannot exceed 280 characters.' })
  }

  try {
    if (quotePostId) {
      const quoteRes = await pool.query('SELECT id FROM posts WHERE id = $1', [quotePostId])
      if (quoteRes.rowCount === 0) return res.status(404).json({ error: 'Quoted post not found.' })
    }
    if (replyToId) {
      const replyCheck = await pool.query('SELECT id FROM posts WHERE id = $1 AND deleted_at IS NULL', [replyToId])
      if (replyCheck.rowCount === 0) return res.status(404).json({ error: 'Post being replied to not found.' })
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, body, media_urls, location, quote_post_id, reply_to_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, body, media_urls, location, quote_post_id, reply_to_id, created_at`,
      [req.user.userId, body, mediaUrls, location, quotePostId, replyToId]
    )
    const post = result.rows[0]
    const actorId = req.user.userId

    // ─── Reply notification ────────────────────────────────────────────────
    if (replyToId) {
      const parentRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [replyToId])
      if (parentRes.rowCount > 0) {
        const parentOwnerId = parentRes.rows[0].user_id
        if (parentOwnerId !== actorId) {
          await pool.query(
            `INSERT INTO notifications (user_id, actor_id, type, post_id)
             VALUES ($1, $2, 'reply', $3)
             ON CONFLICT DO NOTHING`,
            [parentOwnerId, actorId, post.id]
          )
        }
      }
    }

    // ─── Mention notifications ─────────────────────────────────────────────
    if (body) {
      const mentionHandles = [...new Set(
        (body.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1).toLowerCase())
      )]
      if (mentionHandles.length > 0) {
        const mentionRes = await pool.query(
          `SELECT id, username FROM users WHERE username = ANY($1::text[])`,
          [mentionHandles]
        )
        for (const mentionedUser of mentionRes.rows) {
          if (mentionedUser.id !== actorId) {
            await pool.query(
              `INSERT INTO notifications (user_id, actor_id, type, post_id)
               SELECT $1, $2, 'mention', $3
               WHERE NOT EXISTS (
                 SELECT 1 FROM notifications
                 WHERE user_id = $1 AND actor_id = $2 AND type = 'mention' AND post_id = $3
               )`,
              [mentionedUser.id, actorId, post.id]
            )
          }
        }
      }
    }

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId])
    const u = userRes.rows[0]

    return res.status(201).json({
      post: {
        id: post.id,
        body: post.body,
        media_urls: post.media_urls || [],
        location: post.location || '',
        quote_post_id: post.quote_post_id,
        reply_to_id: post.reply_to_id,
        created_at: post.created_at,
        user_id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        like_count: 0,
        repost_count: 0,
        reply_count: 0,
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

// ─── DELETE /api/posts/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.id, 10)
  if (!postId) return res.status(400).json({ error: 'Invalid post id.' })

  try {
    const result = await pool.query(
      `UPDATE posts SET deleted_at = now()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [postId, req.user.userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found or not yours.' })
    }
    return res.json({ success: true })
  } catch (err) {
    console.error('Delete post error:', err)
    return res.status(500).json({ error: 'Failed to delete post.' })
  }
})

module.exports = router

