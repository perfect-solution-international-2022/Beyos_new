-- Adds an optional image to promotions, shown on the public promotions page.
-- Run once; re-running errors if the columns already exist (MySQL 8's
-- multi-column ADD COLUMN IF NOT EXISTS is unreliable, so this omits it).
ALTER TABLE promotions
  ADD COLUMN image_data LONGBLOB NULL,
  ADD COLUMN image_mime VARCHAR(100) NULL;
