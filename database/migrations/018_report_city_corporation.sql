ALTER TABLE reports
  ADD COLUMN location_city_corporation VARCHAR(100);

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
      AND location_city_corporation IS NULL
      AND location_area IS NULL
    )
    OR (
      location_scope = 'BANGLADESH'
      AND location_country_code = 'BD'
      AND location_country_name = 'Bangladesh'
      AND location_division IS NOT NULL
      AND location_district IS NOT NULL
      AND (
        (location_sub_district IS NOT NULL AND location_city_corporation IS NULL AND location_area IS NULL)
        OR (location_sub_district IS NULL AND location_city_corporation IS NOT NULL)
        OR (location_sub_district IS NULL AND location_city_corporation IS NULL AND location_area IS NULL)
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
      AND location_city_corporation IS NULL
      AND location_area IS NULL
    )
  );

CREATE INDEX idx_reports_location_city_corporation
  ON reports(location_city_corporation)
  WHERE location_city_corporation IS NOT NULL;
