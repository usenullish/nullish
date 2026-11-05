-- The default bank relation of the billing settings must belong to the same organization.
CREATE OR REPLACE FUNCTION core.check_billing_settings_bank_relation () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bank_relation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM core.bank_relations
    WHERE id = NEW.bank_relation_id
      AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Bank account % does not belong to the organization of billing settings %',
      NEW.bank_relation_id, NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_billing_settings_bank_relation
BEFORE INSERT OR UPDATE OF bank_relation_id ON core.billing_settings FOR EACH ROW
EXECUTE FUNCTION core.check_billing_settings_bank_relation ();
