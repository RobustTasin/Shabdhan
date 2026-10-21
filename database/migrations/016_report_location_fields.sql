ALTER TABLE reports
  ADD COLUMN location_scope VARCHAR(12),
  ADD COLUMN location_country_code CHAR(2),
  ADD COLUMN location_country_name VARCHAR(100),
  ADD COLUMN location_division VARCHAR(100),
  ADD COLUMN location_district VARCHAR(100),
  ADD COLUMN location_sub_district VARCHAR(120);

ALTER TABLE reports
  ADD CONSTRAINT reports_location_scope_check CHECK (
    (location_scope IS NULL AND location_country_code IS NULL AND location_country_name IS NULL AND location_division IS NULL AND location_district IS NULL AND location_sub_district IS NULL)
    OR (location_scope = 'BANGLADESH' AND location_country_code = 'BD' AND location_country_name = 'Bangladesh' AND location_division IS NOT NULL AND location_district IS NOT NULL AND location_sub_district IS NOT NULL)
    OR (location_scope = 'ABROAD' AND location_country_code IS NOT NULL AND location_country_code <> 'BD' AND location_country_name IS NOT NULL AND location_division IS NULL AND location_district IS NULL AND location_sub_district IS NULL)
  );

CREATE INDEX idx_reports_location_country ON reports(location_country_code);
CREATE INDEX idx_reports_location_bd ON reports(location_division, location_district, location_sub_district)
  WHERE location_scope = 'BANGLADESH';
