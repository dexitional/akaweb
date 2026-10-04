-- Devices registered by the AKATSICO student app (akamobile) for Expo push
-- notifications. Registration is public (no admin session): a device can
-- subscribe before its student signs in. `audiences` carries the student's
-- segments (STUDENT, FRESHER, FINAL, UNDERGRAD, POSTGRAD, ALUMNI) once signed
-- in, so umsk circulars can target the right devices; `topics` are the
-- student's notification preferences.
CREATE TABLE IF NOT EXISTS push_devices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(16) NULL,
  student_id VARCHAR(64) NULL,
  audiences JSON NULL,
  topics JSON NULL,
  app_version VARCHAR(32) NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_devices_token (token),
  KEY idx_push_devices_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
