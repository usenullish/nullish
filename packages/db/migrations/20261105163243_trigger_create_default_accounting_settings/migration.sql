-- When a new organization is created, we create its accounting
-- settings row (base currency, etc.), defaulting to CHF.
CREATE OR REPLACE FUNCTION core.seed_accounting_settings_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO core.accounting_settings (organization_id)
VALUES (NEW.id);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_accounting_settings_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.seed_accounting_settings_for_organization ();
