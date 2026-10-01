CREATE TABLE IF NOT EXISTS profile_views (
  profile_id INT UNSIGNED NOT NULL,
  viewed_on DATE NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, viewed_on),
  KEY idx_profile_views_date (viewed_on),
  CONSTRAINT fk_profile_views_profile FOREIGN KEY (profile_id) REFERENCES staff_profiles (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
