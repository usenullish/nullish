-- This row records a fact (this journal entry is this period's
-- opening balance/result), never something to edit afterward.
CREATE OR REPLACE FUNCTION ledger.check_period_journal_entries_immutable () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Row % cannot be modified once created', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_period_journal_entries_immutable
BEFORE UPDATE ON ledger.period_journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.check_period_journal_entries_immutable ();
