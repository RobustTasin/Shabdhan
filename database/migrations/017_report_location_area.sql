ALTER TABLE reports
  ADD COLUMN location_area VARCHAR(120);

ALTER TABLE reports
  DROP CONSTRAINT reports_location_scope_check,
  ADD CONSTRAINT reports_location_scope_check CHECK (
    (
      location_scope IS NULL
      AND location_country_code IS NULL
      AND location_country_name IS NULL
      AND location_division IS NULL
      AND location_district IS NULL
      AND location_sub_district IS NULL
      AND location_area IS NULL
    )
    OR (
      location_scope = 'BANGLADESH'
      AND location_country_code = 'BD'
      AND location_country_name = 'Bangladesh'
      AND location_division IS NOT NULL
      AND location_district IS NOT NULL
      AND (
        (location_sub_district IS NOT NULL AND location_area IS NULL)
        OR (location_sub_district IS NULL AND location_area IS NOT NULL)
      )
    )
    OR (
      location_scope = 'ABROAD'
      AND location_country_code IS NOT NULL
      AND location_country_code <> 'BD'
      AND location_country_name IS NOT NULL
      AND location_division IS NULL
      AND location_district IS NULL
      AND location_sub_district IS NULL
      AND location_area IS NULL
    )
  );

CREATE INDEX idx_reports_location_area
  ON reports(location_area)
  WHERE location_area IS NOT NULL;
