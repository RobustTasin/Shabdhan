CREATE SEQUENCE IF NOT EXISTS password_reset_application_number_seq;

CREATE TABLE IF NOT EXISTS password_reset_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number BIGINT NOT NULL DEFAULT nextval('password_reset_application_number_seq') UNIQUE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'COMPLETED')),
    code_hash CHAR(64),
    code_expires_at TIMESTAMPTZ,
    attempts SMALLINT NOT NULL DEFAULT 0,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((status = 'APPROVED' AND code_hash IS NOT NULL AND code_expires_at IS NOT NULL)
        OR status <> 'APPROVED')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_applications_pending_email
    ON password_reset_applications (LOWER(email)) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_password_reset_applications_status_created
    ON password_reset_applications (status, created_at DESC);
