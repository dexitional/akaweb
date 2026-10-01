ALTER TABLE departments
  ADD COLUMN directory_category VARCHAR(30) NULL AFTER kind,
  ADD COLUMN code VARCHAR(20) NULL AFTER name,
  ADD COLUMN website_url VARCHAR(500) NULL AFTER location,
  ADD COLUMN is_featured_directory TINYINT(1) NOT NULL DEFAULT 0 AFTER is_published,
  ADD COLUMN related_ids JSON NULL AFTER is_featured_directory;
