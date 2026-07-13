-- Soft delete support for posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS posts_deleted_at_idx ON posts(deleted_at) WHERE deleted_at IS NULL;
