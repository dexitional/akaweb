CREATE TABLE IF NOT EXISTS profile_coviews (
  profile_a INT UNSIGNED NOT NULL,
  profile_b INT UNSIGNED NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_a, profile_b),
  KEY idx_profile_coviews_b (profile_b),
  CONSTRAINT fk_profile_coviews_a FOREIGN KEY (profile_a) REFERENCES staff_profiles (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_profile_coviews_b FOREIGN KEY (profile_b) REFERENCES staff_profiles (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
