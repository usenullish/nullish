-- Enforce that postings can only reference accounts with no children
-- (i.e. leaf accounts). Header/summary accounts exist purely for
-- grouping/reporting rollups and must never receive a direct debit/credit.
CREATE OR REPLACE FUNCTION ledger.check_account_is_leaf () RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ledger.accounts WHERE parent_id = NEW.account_id
  ) THEN
    RAISE EXCEPTION 'Account % has child accounts and cannot receive direct postings', NEW.account_id
      USING ERRCODE = 'R0001';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_leaf_account_posting
BEFORE INSERT OR UPDATE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_account_is_leaf ();
