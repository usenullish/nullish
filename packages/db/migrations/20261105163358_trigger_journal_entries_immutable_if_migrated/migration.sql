-- A migrated journal entry books exactly what the previous accounting tool (e.g. Bexio) booked. It
-- cannot be modified or deleted, a correction is booked with a new entry.
--
-- The flag itself never changes either: an entry of the app cannot be marked as migrated to lock it, and
-- a migrated entry cannot be unmarked to unlock it.
CREATE OR REPLACE FUNCTION ledger.check_journal_entry_immutable_if_migrated () RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

  IF OLD.migrated THEN
    RAISE EXCEPTION 'Journal entry % is migrated and cannot be modified or deleted',
      OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NEW.migrated IS DISTINCT FROM OLD.migrated THEN
    RAISE EXCEPTION 'Journal entry % cannot be marked as migrated',
      OLD.id
      USING ERRCODE = 'R0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_entry_immutable_if_migrated
BEFORE UPDATE OR DELETE ON ledger.journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_immutable_if_migrated ();
