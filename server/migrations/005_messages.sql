-- Conversations (a DM thread between two users)
CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Participants (exactly 2 per conversation for DMs)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conv_part_user_idx ON conversation_participants(user_id);

-- Messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) <= 10000),
  reply_to_id     INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at);
