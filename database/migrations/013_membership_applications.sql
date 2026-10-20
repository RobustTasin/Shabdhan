-- Public membership applications reviewed by moderators.
CREATE SEQUENCE IF NOT EXISTS membership_application_number_seq;

CREATE TABLE IF NOT EXISTS membership_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number BIGINT NOT NULL DEFAULT nextval('membership_application_number_seq'),
    email VARCHAR(255) NOT NULL,
    social_platform VARCHAR(50) NOT NULL,
    social_url TEXT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    account_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT membership_applications_application_number_unique UNIQUE (application_number),
    CONSTRAINT membership_applications_social_url_web_only
        CHECK (social_url ~* '^https?://')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_applications_pending_email
    ON membership_applications (LOWER(email))
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_membership_applications_status_created
    ON membership_applications (status, created_at DESC);

