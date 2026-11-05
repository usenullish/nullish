-- Journal entries linked to a period (its opening balance, its result) are booked by the closing of
-- a period and should not be edited directly to avoid getting out of sync with it.
CREATE OR REPLACE FUNCTION ledger.check_journal_entry_immutable_if_period_linked () RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ledger.period_journal_entries
    WHERE journal_entry_id = COALESCE(NEW.id, OLD.id)
  ) THEN
    RAISE EXCEPTION 'Journal entry % was booked by the closing of a period and cannot be modified or deleted directly',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_entry_immutable_if_period_linked
BEFORE UPDATE OR DELETE ON ledger.journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_immutable_if_period_linked ();
