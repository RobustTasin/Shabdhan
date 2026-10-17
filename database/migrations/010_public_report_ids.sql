-- Add stable public report IDs while preserving UUIDs for internal references and URLs.
CREATE SEQUENCE IF NOT EXISTS report_public_number_seq;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS public_report_number BIGINT,
  ADD COLUMN IF NOT EXISTS public_report_category_code VARCHAR(5);

WITH numbered_reports AS (
  SELECT id,
         COALESCE((SELECT MAX(public_report_number) FROM reports), 0)
           + ROW_NUMBER() OVER (ORDER BY created_at, id) AS serial
  FROM reports
  WHERE public_report_number IS NULL
)
UPDATE reports r
SET public_report_number = numbered_reports.serial
FROM numbered_reports
WHERE r.id = numbered_reports.id;

UPDATE reports r
SET public_report_category_code = CASE
  WHEN c.id IS NULL THEN 'OTHER'
  WHEN REGEXP_REPLACE(UPPER(c.name), '[^A-Z]', '', 'g') = 'CONSUMERCOMPLAINT' THEN 'CONS'
  WHEN REGEXP_REPLACE(UPPER(c.name), '[^A-Z]', '', 'g') = 'CYBERCRIME' THEN 'CYBR'
  WHEN REGEXP_REPLACE(UPPER(c.name), '[^A-Z]', '', 'g') = 'FRAUD' THEN 'FRUD'
  WHEN LENGTH(REGEXP_REPLACE(UPPER(c.name), '[^A-Z]', '', 'g')) >= 3
    THEN LEFT(REGEXP_REPLACE(UPPER(c.name), '[^A-Z]', '', 'g'), 5)
  ELSE 'OTHER'
END
FROM categories c
WHERE r.category_id = c.id
  AND r.public_report_category_code IS NULL;

UPDATE reports
SET public_report_category_code = 'OTHER'
WHERE public_report_category_code IS NULL;

SELECT setval(
  'report_public_number_seq',
  GREATEST(COALESCE(MAX(public_report_number), 0) + 1, 1),
  false
)
FROM reports;

ALTER TABLE reports
  ALTER COLUMN public_report_number SET DEFAULT nextval('report_public_number_seq'),
  ALTER COLUMN public_report_number SET NOT NULL,
  ALTER COLUMN public_report_category_code SET DEFAULT 'OTHER',
  ALTER COLUMN public_report_category_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_public_report_number
  ON reports(public_report_number);
