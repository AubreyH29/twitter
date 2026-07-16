#!/usr/bin/env node

const crypto = require('crypto')
const pool = require('../db')

const DEFAULT_COUNT = 25
const MAX_COUNT = 1000
const FALLBACK_PASSWORD_HASH = 'fake-seed-user-no-login'

const firstNames = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Eli', 'Ivy', 'Owen', 'Nina', 'Kai']
const lastNames = ['Rivera', 'Chen', 'Patel', 'Morgan', 'Reed', 'Brooks', 'Carter', 'Stone', 'Kim', 'Diaz']
const topics = ['frontend polish', 'database indexes', 'product ideas', 'coffee', 'launch day', 'bug hunts', 'design systems', 'API ergonomics']
const openings = ['Just shipped', 'Thinking about', 'Today I learned', 'Tiny update:', 'Hot take:', 'Debugging', 'Prototype note:', 'Weekend build:']
const endings = ['and it feels great.', 'with a surprisingly small diff.', 'because details matter.', 'before the next deploy.', 'while the coffee is still warm.', 'and the timeline is happier for it.']
const locations = ['', '', '', 'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Remote']

function printHelp() {
  console.log(`Generate fake tweets for local development.\n\nUsage:\n  node scripts/generate-fake-tweets.js [options]\n\nOptions:\n  -c, --count <number>       Number of tweets to create (default: ${DEFAULT_COUNT}, max: ${MAX_COUNT})\n  -u, --username <username>  Attribute all tweets to an existing username\n      --user-id <id>         Attribute all tweets to an existing user id\n      --dry-run              Print sample tweets without writing to the database\n  -h, --help                 Show this help message\n\nDatabase connection uses the same POSTGRES_* environment variables as the API server.`)
}

function parseArgs(argv) {
  const options = { count: DEFAULT_COUNT, username: null, userId: null, dryRun: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      options.help = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '-c' || arg === '--count') {
      options.count = parseCount(argv[++index])
    } else if (arg.startsWith('--count=')) {
      options.count = parseCount(arg.split('=')[1])
    } else if (arg === '-u' || arg === '--username') {
      options.username = requireValue(argv[++index], arg).replace(/^@/, '').toLowerCase()
    } else if (arg.startsWith('--username=')) {
      options.username = requireValue(arg.split('=')[1], '--username').replace(/^@/, '').toLowerCase()
    } else if (arg === '--user-id') {
      options.userId = parseUserId(argv[++index])
    } else if (arg.startsWith('--user-id=')) {
      options.userId = parseUserId(arg.split('=')[1])
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (options.username && options.userId) {
    throw new Error('Use either --username or --user-id, not both.')
  }

  return options
}

function requireValue(value, flag) {
  if (!value) throw new Error(`${flag} requires a value.`)
  return value
}

function parseCount(value) {
  const count = Number.parseInt(requireValue(value, '--count'), 10)
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new Error(`--count must be an integer between 1 and ${MAX_COUNT}.`)
  }
  return count
}

function parseUserId(value) {
  const userId = Number.parseInt(requireValue(value, '--user-id'), 10)
  if (!Number.isInteger(userId) || userId < 1) throw new Error('--user-id must be a positive integer.')
  return userId
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function fakeTweetBody(index) {
  const suffix = crypto.randomBytes(3).toString('hex')
  return `${randomItem(openings)} ${randomItem(topics)} #${index + 1} ${randomItem(endings)} (${suffix})`
}

function fakeCreatedAt(index) {
  const minutesAgo = index * 7 + Math.floor(Math.random() * 6)
  return new Date(Date.now() - minutesAgo * 60 * 1000)
}

async function ensureSeedUsers(client, count) {
  const users = []
  const neededUsers = Math.min(10, Math.max(1, Math.ceil(count / 5)))

  for (let index = 0; index < neededUsers; index += 1) {
    const firstName = firstNames[index % firstNames.length]
    const lastName = lastNames[index % lastNames.length]
    const username = `fake_${firstName}_${lastName}_${index + 1}`.toLowerCase()
    const email = `${username}@example.test`

    const result = await client.query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
       RETURNING id, username`,
      [firstName, lastName, username, email, FALLBACK_PASSWORD_HASH, 'Fake account generated for local development.']
    )
    users.push(result.rows[0])
  }

  return users
}

async function findUser(client, options) {
  if (options.userId) {
    const result = await client.query('SELECT id, username FROM users WHERE id = $1', [options.userId])
    if (result.rowCount === 0) throw new Error(`No user found with id ${options.userId}.`)
    return [result.rows[0]]
  }

  if (options.username) {
    const result = await client.query('SELECT id, username FROM users WHERE username = $1', [options.username])
    if (result.rowCount === 0) throw new Error(`No user found with username @${options.username}.`)
    return [result.rows[0]]
  }

  return ensureSeedUsers(client, options.count)
}

async function createTweets(options) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const users = await findUser(client, options)
    const inserted = []

    for (let index = 0; index < options.count; index += 1) {
      const user = users[index % users.length]
      const body = fakeTweetBody(index)
      const location = randomItem(locations)
      const createdAt = fakeCreatedAt(index)
      const result = await client.query(
        `INSERT INTO posts (user_id, body, media_urls, location, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, body, created_at`,
        [user.id, body, [], location, createdAt]
      )
      inserted.push({ ...result.rows[0], username: user.username })
    }

    await client.query('COMMIT')
    return inserted
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (options.dryRun) {
    Array.from({ length: options.count }, (_, index) => console.log(fakeTweetBody(index)))
    return
  }

  const tweets = await createTweets(options)
  console.log(`Created ${tweets.length} fake tweet${tweets.length === 1 ? '' : 's'}.`)
  tweets.slice(0, 5).forEach((tweet) => {
    console.log(`- #${tweet.id} @${tweet.username}: ${tweet.body}`)
  })
  if (tweets.length > 5) console.log(`...and ${tweets.length - 5} more.`)
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
