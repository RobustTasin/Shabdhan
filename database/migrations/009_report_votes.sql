-- Store one upvote or downvote per signed-in user and report.
CREATE TABLE IF NOT EXISTS report_votes (
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_votes_report_vote
    ON report_votes(report_id, vote);
