require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const pool = require('./db')

const app = express()
const PORT = process.env.API_PORT || 4000

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Run migrations on startup ───────────────────────────────────────────────
async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await pool.query(sql)
    console.log(`Migration applied: ${file}`)
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/posts', require('./routes/posts'))
app.use('/api/social', require('./routes/social'))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations()
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
