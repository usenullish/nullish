-- When a new organization is created, we create its billing
-- settings row (payment term, etc.), defaulting to 30 days.
CREATE OR REPLACE FUNCTION core.seed_billing_settings_for_organization () RETURNS TRIGGER AS $$
BEGIN
INSERT INTO core.billing_settings (organization_id)
VALUES (NEW.id);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER seed_billing_settings_on_organization_created
AFTER INSERT ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.seed_billing_settings_for_organization ();
