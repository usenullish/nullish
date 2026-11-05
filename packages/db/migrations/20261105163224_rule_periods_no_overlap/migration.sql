-- Prevent overlapping periods within the same organization.
ALTER TABLE ledger.periods
ADD CONSTRAINT periods_no_overlap EXCLUDE USING gist (
  organization_id
  WITH
    =,
    daterange (start_on, end_on, '[]')
  WITH
    &&
);
