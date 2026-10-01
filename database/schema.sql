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

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reporter_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    social_account_id UUID NOT NULL
        REFERENCES social_accounts(id)
        ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    status report_status NOT NULL DEFAULT 'DRAFT',

    verification_status verification_status
        NOT NULL DEFAULT 'PENDING',

    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_reports_reporter_id
    ON reports(reporter_id);

CREATE INDEX idx_reports_social_account_id
    ON reports(social_account_id);

CREATE INDEX idx_reports_status
    ON reports(status);

CREATE INDEX idx_reports_verification_status
    ON reports(verification_status); 

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

    