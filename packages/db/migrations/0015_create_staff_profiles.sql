CREATE TABLE IF NOT EXISTS staff_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(160) NOT NULL,
  staff_type ENUM('teaching', 'non-teaching') NULL,
  staff_status ENUM('active', 'post-retirement', 'on-secondment', 'in-memoriam', 'exited') NOT NULL DEFAULT 'active',
  photo_url VARCHAR(700) NULL,
  about TEXT NULL,
  details JSON NULL,
  is_new_face TINYINT(1) NOT NULL DEFAULT 0,
  joined_on DATE NULL,
  is_appointed_head TINYINT(1) NOT NULL DEFAULT 0,
  appointed_on DATE NULL,
  profile_views INT UNSIGNED NOT NULL DEFAULT 0,
  shares INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_profiles_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
