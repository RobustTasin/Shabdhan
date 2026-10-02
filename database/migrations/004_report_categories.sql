-- Add report categories
-- Run after the base schema has been created.

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_category_id_fkey;

ALTER TABLE reports
ADD CONSTRAINT reports_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_category_id
ON reports(category_id);
