-- Record whether each incident occurred online or offline and, for online
-- reports, the platform involved. Existing reports reference a social account,
-- so preserve its platform as the historical incident platform.
ALTER TABLE reports
    ADD COLUMN incident_type VARCHAR(10),
    ADD COLUMN incident_platform VARCHAR(100);

UPDATE reports r
SET incident_type = 'ONLINE',
    incident_platform = sa.platform
FROM social_accounts sa
WHERE sa.id = r.social_account_id;

ALTER TABLE reports
    ALTER COLUMN incident_type SET DEFAULT 'ONLINE',
    ALTER COLUMN incident_type SET NOT NULL,
    ADD CONSTRAINT reports_incident_location_check
        CHECK (
            (incident_type = 'ONLINE' AND incident_platform <> '')
            OR (incident_type = 'OFFLINE' AND incident_platform IS NULL)
        );
