-- Fast public report search indexes

CREATE INDEX IF NOT EXISTS idx_reports_title_trgm
ON reports
USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reports_description_trgm
ON reports
USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_social_accounts_display_name_trgm
ON social_accounts
USING GIN (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_reports_category_id
ON reports(category_id);

CREATE INDEX IF NOT EXISTS idx_reports_public_search
ON reports(status, verification_status, created_at DESC);
