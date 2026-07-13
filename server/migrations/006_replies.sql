-- Reply support: self-referencing reply_to_id on posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS posts_reply_to_id_idx ON posts(reply_to_id);
