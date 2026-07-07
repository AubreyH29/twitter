-- Users table
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  username         TEXT UNIQUE NOT NULL,
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  reset_token      TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
