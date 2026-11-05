-- The money of a bank relation is booked on its ledger account, so that account must belong to the
-- same organization, be an asset account and have no child accounts (postings are only allowed on
-- accounts without children).
CREATE OR REPLACE FUNCTION core.check_bank_relation_ledger_account () RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ledger.accounts
    WHERE id = NEW.account_id
      AND organization_id = NEW.organization_id
      AND type = 'asset'
  ) THEN
    RAISE EXCEPTION 'Account % is not an asset account of the organization of bank account %',
      NEW.account_id, NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.accounts
    WHERE parent_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'Account % has child accounts and cannot be the ledger account of bank account %',
      NEW.account_id, NEW.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_bank_relation_ledger_account
BEFORE INSERT OR UPDATE OF account_id ON core.bank_relations FOR EACH ROW
EXECUTE FUNCTION core.check_bank_relation_ledger_account ();
