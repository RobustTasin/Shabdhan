ALTER TABLE membership_applications
    ADD COLUMN IF NOT EXISTS code_encrypted TEXT;
