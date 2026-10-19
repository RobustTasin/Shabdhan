-- ============================================================
-- Shabdhan Database Schema
-- PostgreSQL 18+
-- ============================================================

-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'USER',
    'MODERATOR',
    'ADMIN',
    'ENTITY_OWNER'
);

CREATE TYPE report_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'UNDER_REVIEW',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);

CREATE TYPE evidence_type AS ENUM (
    'IMAGE',
    'VIDEO',
    'DOCUMENT',
    'LINK',
    'OTHER'
);

CREATE TYPE dispute_result AS ENUM (
    'PENDING',
    'UPHELD',
    'REJECTED'
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role user_role NOT NULL DEFAULT 'USER',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================

CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    platform VARCHAR(50) NOT NULL,
    username VARCHAR(255) NOT NULL,
    profile_url TEXT,

    display_name VARCHAR(255),
    account_id VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_platform_username
        UNIQUE (platform, username)
);


-- Trigram index for username searching
CREATE INDEX idx_social_accounts_username_trgm
    ON social_accounts
    USING GIN (username gin_trgm_ops);

 -- ============================================================
-- REPORTS
-- ============================================================

CREATE SEQUENCE report_public_number_seq;

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    public_report_number BIGINT NOT NULL DEFAULT nextval('report_public_number_seq'),
    public_report_category_code VARCHAR(5) NOT NULL DEFAULT 'OTHER',

    reporter_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    social_account_id UUID NOT NULL
        REFERENCES social_accounts(id)
        ON DELETE CASCADE,

    category_id UUID,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    incident_type VARCHAR(10) NOT NULL DEFAULT 'ONLINE',
    incident_platform VARCHAR(100) NOT NULL,

    status report_status NOT NULL DEFAULT 'DRAFT',

    verification_status verification_status
        NOT NULL DEFAULT 'PENDING',

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reports_incident_location_check
        CHECK (
            (incident_type = 'ONLINE' AND incident_platform <> '')
            OR (incident_type = 'OFFLINE' AND incident_platform IS NULL)
        )
);


CREATE INDEX idx_reports_reporter_id
    ON reports(reporter_id);

CREATE INDEX idx_reports_social_account_id
    ON reports(social_account_id);

CREATE INDEX idx_reports_status
    ON reports(status);

CREATE INDEX idx_reports_verification_status
    ON reports(verification_status); 

CREATE UNIQUE INDEX idx_reports_public_report_number
    ON reports(public_report_number);

-- One persistent upvote or downvote per signed-in user and report.
CREATE TABLE report_votes (
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (report_id, user_id)
);

CREATE INDEX idx_report_votes_report_vote ON report_votes(report_id, vote);

 -- ============================================================
-- EVIDENCE
-- ============================================================

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    uploaded_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    evidence_type evidence_type NOT NULL,

    file_name VARCHAR(255),
    file_url TEXT,
    file_hash VARCHAR(64),

    description TEXT,

    verification_status verification_status
        NOT NULL DEFAULT 'PENDING',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_evidence_report_id
    ON evidence(report_id);

CREATE INDEX idx_evidence_uploaded_by
    ON evidence(uploaded_by);

CREATE INDEX idx_evidence_file_hash
    ON evidence(file_hash);

CREATE INDEX idx_evidence_verification_status
    ON evidence(verification_status);
 -- ============================================================
-- CORROBORATIONS
-- ============================================================

CREATE TABLE corroborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_report_corroboration
        UNIQUE (report_id, user_id)
);


CREATE INDEX idx_corroborations_report_id
    ON corroborations(report_id);

CREATE INDEX idx_corroborations_user_id
    ON corroborations(user_id);
  -- ============================================================
-- DISPUTES
-- ============================================================

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    submitted_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    reason TEXT NOT NULL,

    result dispute_result NOT NULL DEFAULT 'PENDING',

    reviewed_by UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    review_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_disputes_report_id
    ON disputes(report_id);

CREATE INDEX idx_disputes_submitted_by
    ON disputes(submitted_by);

CREATE INDEX idx_disputes_reviewed_by
    ON disputes(reviewed_by);

CREATE INDEX idx_disputes_result
    ON disputes(result);
   -- ============================================================
-- RESPONSES
-- ============================================================

CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_responses_report_id
    ON responses(report_id);

CREATE INDEX idx_responses_user_id
    ON responses(user_id);
  -- ============================================================
-- COMMENTS
-- ============================================================

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    parent_comment_id UUID
        REFERENCES comments(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_comments_report_id
    ON comments(report_id);

CREATE INDEX idx_comments_user_id
    ON comments(user_id);

CREATE INDEX idx_comments_parent_comment_id
    ON comments(parent_comment_id);

 -- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(100),
    entity_id UUID,

    old_data JSONB,
    new_data JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_action
    ON audit_logs(action);

CREATE INDEX idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_created_at
    ON audit_logs(created_at);     

    -- ============================================================
-- RISK SCORES
-- ============================================================

CREATE TABLE risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    report_id UUID NOT NULL
        REFERENCES reports(id)
        ON DELETE CASCADE,

    score NUMERIC(5,2) NOT NULL,

    explanation TEXT,

    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT risk_score_range
        CHECK (score >= 0 AND score <= 100)
);


CREATE INDEX idx_risk_scores_report_id
    ON risk_scores(report_id);

CREATE INDEX idx_risk_scores_calculated_at
    ON risk_scores(calculated_at);           

    -- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_categories_name
    ON categories(name);

CREATE INDEX idx_categories_is_active
    ON categories(is_active);

INSERT INTO categories (name, description) VALUES
    ('Assault', 'Physical attacks or attempted attacks against a person.'),
    ('Child safety', 'Reports involving the safety or exploitation of children.'),
    ('Corruption and abuse of power', 'Bribery, misuse of public authority, or abuse of entrusted power.'),
    ('Cybercrime', 'Online fraud, account compromise, digital threats, or other technology-enabled crime.'),
    ('Fraud and scams', 'Deception intended to steal money, property, or personal information.'),
    ('Harassment', 'Repeated unwanted targeting, intimidation, or abusive conduct.'),
    ('Hate speech and discrimination', 'Targeting or unequal treatment based on identity or protected characteristics.'),
    ('Missing persons', 'Information about a person whose whereabouts are unknown.'),
    ('Murder or attempted murder', 'Reports of a suspected killing or attempted killing.'),
    ('Other concerns', 'A report that does not fit another listed category.'),
    ('Rape and sexual violence', 'Reports of rape, sexual assault, or other sexual violence.'),
    ('Threats of violence', 'Threats to kill, injure, or physically harm a person.'),
    ('Violence', 'Other violent incidents or threats not covered by a more specific category.'),
    ('Public safety', 'Hazards or incidents that may put the wider community at risk.')
ON CONFLICT (name) DO NOTHING;
