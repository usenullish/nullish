-- Prevent overlapping VAT periods within the same organization.
ALTER TABLE core.vat_periods
ADD CONSTRAINT vat_periods_no_overlap EXCLUDE USING gist (
  organization_id
  WITH
    =,
    daterange (start_on, end_on, '[]')
  WITH
    &&
);
