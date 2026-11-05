-- VAT methods only make sense for an organization registered for VAT, i.e. one with VAT settings.
CREATE OR REPLACE FUNCTION core.check_vat_methods_settings () RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM core.vat_settings WHERE organization_id = NEW.organization_id) THEN
    RAISE EXCEPTION 'VAT methods require the VAT settings of the organization (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_vat_methods_settings
BEFORE INSERT ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_methods_settings ();
