-- Allow empty body (validated at app level so media-only posts are allowed)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_body_check;

-- Media attachments and location
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location   TEXT    DEFAULT '';
