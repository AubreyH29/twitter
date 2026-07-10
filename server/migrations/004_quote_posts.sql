-- Quote posts allow users to create a new post that references another post.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_body_check;
ALTER TABLE posts ADD CONSTRAINT posts_body_check CHECK (char_length(body) <= 280);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS quote_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_quote_post_id_idx ON posts(quote_post_id);

-- Direct repost timeline lookups are ordered by the repost creation time.
CREATE INDEX IF NOT EXISTS reposts_created_at_idx ON reposts(created_at DESC);
