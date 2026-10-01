-- ============================================================
-- Shabdhan Migration 002
-- Automatically update updated_at on row updates
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_accounts_updated_at
BEFORE UPDATE ON social_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER evidence_updated_at
BEFORE UPDATE ON evidence
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER responses_updated_at
BEFORE UPDATE ON responses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER risk_scores_updated_at
BEFORE UPDATE ON risk_scores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
