-- Shared: generate VAT periods for an org from a start date through the end
-- of that calendar year, or through p_end_on when it is earlier (e.g. a ledger
-- period that ends mid-year). Frequency is derived from the VAT payment method
-- (net_rate = semi-annual, effective = quarterly).
-- Periods are aligned to the calendar (semesters or quarters): a mid-year start
-- only shortens the first period, it does not shift the following ones.
CREATE OR REPLACE FUNCTION core.generate_vat_periods (
  p_organization_id uuid,
  p_start_on date,
  p_payment_method core.vat_payment_method,
  p_end_on date DEFAULT NULL
) RETURNS void AS $$
DECLARE
v_months int := CASE p_payment_method
    WHEN 'net_rate' THEN 6
    WHEN 'effective' THEN 3
END;
  v_end_on date := LEAST(make_date(extract(year FROM p_start_on)::int, 12, 31), p_end_on);
  v_cursor date := p_start_on;
  v_period_end date;
BEGIN
  IF v_months IS NULL THEN
    RAISE EXCEPTION 'Unsupported VAT payment method: %', p_payment_method;
END IF;

  WHILE v_cursor <= v_end_on LOOP
    v_period_end := LEAST(
      (
        make_date(
          extract(year FROM v_cursor)::int,
          ((extract(month FROM v_cursor)::int - 1) / v_months + 1) * v_months,
          1
        ) + interval '1 month' - interval '1 day'
      )::date,
      v_end_on
    );

    INSERT INTO core.vat_periods (organization_id, start_on, end_on, status)
    VALUES (p_organization_id, v_cursor, v_period_end, 'open')
    ON CONFLICT DO NOTHING;

    v_cursor := v_period_end + 1;
END LOOP;
END;
$$ LANGUAGE plpgsql;
