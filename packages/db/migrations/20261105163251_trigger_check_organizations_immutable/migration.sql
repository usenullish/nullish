-- legal_form drives the seeded chart of accounts at creation time;
-- changing it afterward would leave the org's accounts out of sync
-- with its declared legal form.
CREATE OR REPLACE FUNCTION core.check_organizations_legal_form_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.legal_form != OLD.legal_form THEN
    RAISE EXCEPTION 'legal_form cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_organizations_legal_form_immutable
BEFORE UPDATE ON core.organizations FOR EACH ROW
EXECUTE FUNCTION core.check_organizations_legal_form_immutable ();
