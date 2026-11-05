-- When a new organization is created, we open its first period: the current calendar year, the
-- most common fiscal year. Its dates can be changed afterwards (see ledger.check_period_dates).
CREATE OR REPLACE FUNCTION ledger.seed_period_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO ledger.periods (organization_id, start_on, end_on)
VALUES (
  NEW.id,
  date_trunc('year', current_date)::date,
  (date_trunc('year', current_date) + interval '1 year' - interval '1 day')::date
);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_period_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION ledger.seed_period_for_organization ();
