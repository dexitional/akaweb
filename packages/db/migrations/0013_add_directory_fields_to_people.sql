ALTER TABLE people
  ADD COLUMN profile_slug VARCHAR(160) NULL AFTER title,
  ADD COLUMN unit_role VARCHAR(120) NULL AFTER profile_slug,
  ADD KEY idx_people_profile_slug (profile_slug);
