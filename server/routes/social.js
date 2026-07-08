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

// ─── POST /api/social/follow/:username ───────────────────────────────────────
router.post('/follow/:username', requireAuth, async (req, res) => {
  const { username } = req.params
  const followerId = req.user.userId

  try {
    const targetRes = await pool.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [username.toLowerCase()]
    )
    if (targetRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    const followingId = targetRes.rows[0].id

    if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself.' })

    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    )

    // Create follow notification (avoid duplicates)
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type)
       SELECT $1, $2, 'follow'
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
         WHERE user_id = $1 AND actor_id = $2 AND type = 'follow'
       )`,
      [followingId, followerId]
    )

    const counts = await getFollowCounts(followingId)
    return res.json({ following: true, ...counts })
  } catch (err) {
    console.error('Follow error:', err)
    return res.status(500).json({ error: 'Failed to follow user.' })
  }
})

// ─── DELETE /api/social/follow/:username ─────────────────────────────────────
router.delete('/follow/:username', requireAuth, async (req, res) => {
  const { username } = req.params
  const followerId = req.user.userId

  try {
    const targetRes = await pool.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [username.toLowerCase()]
    )
    if (targetRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    const followingId = targetRes.rows[0].id

    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    )

    await pool.query(
      `DELETE FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = 'follow'`,
      [followingId, followerId]
    )

    const counts = await getFollowCounts(followingId)
    return res.json({ following: false, ...counts })
  } catch (err) {
    console.error('Unfollow error:', err)
    return res.status(500).json({ error: 'Failed to unfollow user.' })
  }
})

async function getFollowCounts(userId) {
  const r = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS follower_count,
       (SELECT COUNT(*) FROM follows WHERE follower_id  = $1) AS following_count`,
    [userId]
  )
  return {
    follower_count: parseInt(r.rows[0].follower_count),
    following_count: parseInt(r.rows[0].following_count),
  }
}

// ─── POST /api/social/like/:postId ───────────────────────────────────────────
router.post('/like/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId])
    if (postRes.rowCount === 0) return res.status(404).json({ error: 'Post not found.' })

    await pool.query(
      'INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, postId]
    )

    // Notify post owner (not self-like)
    const ownerId = postRes.rows[0].user_id
    if (ownerId !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, actor_id, type, post_id)
         SELECT $1, $2, 'like', $3
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE user_id = $1 AND actor_id = $2 AND type = 'like' AND post_id = $3
         )`,
        [ownerId, userId, postId]
      )
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId])
    return res.json({ liked: true, like_count: parseInt(countRes.rows[0].count) })
  } catch (err) {
    console.error('Like error:', err)
    return res.status(500).json({ error: 'Failed to like post.' })
  }
})

// ─── DELETE /api/social/like/:postId ─────────────────────────────────────────
router.delete('/like/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId])

    const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId])
    if (postRes.rowCount > 0) {
      const ownerId = postRes.rows[0].user_id
      await pool.query(
        `DELETE FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = 'like' AND post_id = $3`,
        [ownerId, userId, postId]
      )
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId])
    return res.json({ liked: false, like_count: parseInt(countRes.rows[0].count) })
  } catch (err) {
    console.error('Unlike error:', err)
    return res.status(500).json({ error: 'Failed to unlike post.' })
  }
})

// ─── POST /api/social/repost/:postId ─────────────────────────────────────────
router.post('/repost/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId])
    if (postRes.rowCount === 0) return res.status(404).json({ error: 'Post not found.' })

    await pool.query(
      'INSERT INTO reposts (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, postId]
    )

    const ownerId = postRes.rows[0].user_id
    if (ownerId !== userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, actor_id, type, post_id)
         SELECT $1, $2, 'repost', $3
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE user_id = $1 AND actor_id = $2 AND type = 'repost' AND post_id = $3
         )`,
        [ownerId, userId, postId]
      )
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [postId])
    return res.json({ reposted: true, repost_count: parseInt(countRes.rows[0].count) })
  } catch (err) {
    console.error('Repost error:', err)
    return res.status(500).json({ error: 'Failed to repost.' })
  }
})

// ─── DELETE /api/social/repost/:postId ───────────────────────────────────────
router.delete('/repost/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    await pool.query('DELETE FROM reposts WHERE user_id = $1 AND post_id = $2', [userId, postId])

    const postRes = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId])
    if (postRes.rowCount > 0) {
      const ownerId = postRes.rows[0].user_id
      await pool.query(
        `DELETE FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = 'repost' AND post_id = $3`,
        [ownerId, userId, postId]
      )
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM reposts WHERE post_id = $1', [postId])
    return res.json({ reposted: false, repost_count: parseInt(countRes.rows[0].count) })
  } catch (err) {
    console.error('Unrepost error:', err)
    return res.status(500).json({ error: 'Failed to unrepost.' })
  }
})

// ─── POST /api/social/bookmark/:postId ───────────────────────────────────────
router.post('/bookmark/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    const postRes = await pool.query('SELECT id FROM posts WHERE id = $1', [postId])
    if (postRes.rowCount === 0) return res.status(404).json({ error: 'Post not found.' })

    await pool.query(
      'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, postId]
    )
    return res.json({ bookmarked: true })
  } catch (err) {
    console.error('Bookmark error:', err)
    return res.status(500).json({ error: 'Failed to bookmark post.' })
  }
})

// ─── DELETE /api/social/bookmark/:postId ─────────────────────────────────────
router.delete('/bookmark/:postId', requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId)
  const userId = req.user.userId

  if (isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID.' })

  try {
    await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId])
    return res.json({ bookmarked: false })
  } catch (err) {
    console.error('Unbookmark error:', err)
    return res.status(500).json({ error: 'Failed to unbookmark post.' })
  }
})

// ─── GET /api/social/bookmarks ────────────────────────────────────────────────
router.get('/bookmarks', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l.user_id)::int  AS like_count,
         COUNT(DISTINCT r.user_id)::int  AS repost_count,
         true AS bookmarked_by_me,
         EXISTS(SELECT 1 FROM likes   WHERE post_id = p.id AND user_id = $1) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts WHERE post_id = p.id AND user_id = $1) AS reposted_by_me
       FROM bookmarks bk
       JOIN posts p ON p.id = bk.post_id
       JOIN users u ON u.id = p.user_id
       LEFT JOIN likes   l ON l.post_id = p.id
       LEFT JOIN reposts r ON r.post_id = p.id
       WHERE bk.user_id = $1
       GROUP BY p.id, u.id, bk.created_at
       ORDER BY bk.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )
    return res.json({ posts: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get bookmarks error:', err)
    return res.status(500).json({ error: 'Failed to load bookmarks.' })
  }
})

// ─── GET /api/social/who-to-follow ───────────────────────────────────────────
router.get('/who-to-follow', requireAuth, async (req, res) => {
  const userId = req.user.userId

  try {
    const result = await pool.query(
      `SELECT
         u.id, u.first_name, u.last_name, u.username,
         (SELECT COUNT(*) FROM follows WHERE following_id = u.id)::int AS follower_count
       FROM users u
       WHERE u.id != $1
         AND u.id NOT IN (
           SELECT following_id FROM follows WHERE follower_id = $1
         )
       ORDER BY follower_count DESC, u.created_at DESC
       LIMIT 5`,
      [userId]
    )
    return res.json({ users: result.rows })
  } catch (err) {
    console.error('Who to follow error:', err)
    return res.status(500).json({ error: 'Failed to load suggestions.' })
  }
})

// ─── GET /api/social/notifications ───────────────────────────────────────────
router.get('/notifications', requireAuth, async (req, res) => {
  const userId = req.user.userId
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 30
  const offset = (page - 1) * limit

  try {
    const result = await pool.query(
      `SELECT
         n.id, n.type, n.read, n.created_at, n.post_id,
         u.id AS actor_id, u.first_name AS actor_first_name,
         u.last_name AS actor_last_name, u.username AS actor_username,
         p.body AS post_body
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       LEFT JOIN posts p ON p.id = n.post_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    )

    return res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count),
      page,
      hasMore: result.rows.length === limit,
    })
  } catch (err) {
    console.error('Get notifications error:', err)
    return res.status(500).json({ error: 'Failed to load notifications.' })
  }
})

// ─── PUT /api/social/notifications/read-all ──────────────────────────────────
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  const userId = req.user.userId
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [userId])
    return res.json({ ok: true })
  } catch (err) {
    console.error('Mark notifications read error:', err)
    return res.status(500).json({ error: 'Failed to mark notifications as read.' })
  }
})

// ─── GET /api/social/likes/:username ─────────────────────────────────────────
// Posts liked by a user (for profile Likes tab)
router.get('/likes/:username', requireAuth, async (req, res) => {
  const { username } = req.params
  const currentUserId = req.user.userId
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE username = $1 LIMIT 1',
      [username.toLowerCase()]
    )
    if (userRes.rowCount === 0) return res.status(404).json({ error: 'User not found.' })
    const targetUserId = userRes.rows[0].id

    const result = await pool.query(
      `SELECT
         p.id, p.body, p.media_urls, p.location, p.created_at,
         u.id AS user_id, u.first_name, u.last_name, u.username,
         COUNT(DISTINCT l2.user_id)::int AS like_count,
         COUNT(DISTINCT rp.user_id)::int AS repost_count,
         EXISTS(SELECT 1 FROM likes     WHERE post_id = p.id AND user_id = $2) AS liked_by_me,
         EXISTS(SELECT 1 FROM reposts   WHERE post_id = p.id AND user_id = $2) AS reposted_by_me,
         EXISTS(SELECT 1 FROM bookmarks WHERE post_id = p.id AND user_id = $2) AS bookmarked_by_me
       FROM likes lk
       JOIN posts  p  ON p.id = lk.post_id
       JOIN users  u  ON u.id = p.user_id
       LEFT JOIN likes   l2 ON l2.post_id = p.id
       LEFT JOIN reposts rp ON rp.post_id = p.id
       WHERE lk.user_id = $1
       GROUP BY p.id, u.id, lk.created_at
       ORDER BY lk.created_at DESC
       LIMIT $3 OFFSET $4`,
      [targetUserId, currentUserId, limit, offset]
    )
    return res.json({ posts: result.rows, page, hasMore: result.rows.length === limit })
  } catch (err) {
    console.error('Get liked posts error:', err)
    return res.status(500).json({ error: 'Failed to load liked posts.' })
  }
})

module.exports = router
