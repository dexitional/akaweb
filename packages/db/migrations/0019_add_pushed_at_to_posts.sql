-- When a post's push notification went out. NULL = not yet pushed; the push
-- sweeper sends live posts (published, published_at <= NOW()) still NULL here.
ALTER TABLE posts ADD COLUMN pushed_at DATETIME NULL AFTER published_at;

-- Everything already published counts as pushed, so deploying this never
-- notifies students about old news.
UPDATE posts SET pushed_at = published_at WHERE status = 'published';
