-- An account's type can be freely changed until it has any postings,
-- since past postings depend on the classification that applied at the time.
CREATE OR REPLACE FUNCTION ledger.check_accounts_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type != OLD.type AND EXISTS (SELECT 1 FROM ledger.postings WHERE account_id = OLD.id) THEN
    RAISE EXCEPTION 'type cannot be changed once the account has postings (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_accounts_immutable
BEFORE UPDATE ON ledger.accounts FOR EACH ROW
EXECUTE FUNCTION ledger.check_accounts_immutable ();
