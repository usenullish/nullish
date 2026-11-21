-- Prevent overlapping tax rates for the same provider, so that exactly one rate
-- applies on a given date.
ALTER TABLE subscription.subscription_tax_rates
ADD CONSTRAINT subscription_tax_rates_no_overlap EXCLUDE USING gist (
  provider
  WITH
    =,
    daterange (start_on, end_on, '[]')
  WITH
    &&
);
