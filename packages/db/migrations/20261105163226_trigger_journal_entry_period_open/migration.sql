-- A journal entry can only be inserted, modified, or deleted if its date
-- falls within an OPEN period for its organization. A date with no
-- matching period at all is rejected, same as a date in a closed period.
CREATE OR REPLACE FUNCTION ledger.check_journal_entry_period_open () RETURNS TRIGGER AS $$
DECLARE
target_org_id uuid := COALESCE(NEW.organization_id, OLD.organization_id);
  target_valid_on date := COALESCE(NEW.valid_on, OLD.valid_on);
  matched_status ledger.period_status;
BEGIN
  IF TG_OP = 'DELETE' AND NOT core.organization_exists(OLD.organization_id) THEN
    RETURN OLD;
  END IF;

SELECT status INTO matched_status
FROM ledger.periods
WHERE organization_id = target_org_id
  AND start_on <= target_valid_on
  AND target_valid_on <= end_on
    LIMIT 1;

IF NOT FOUND THEN
    RAISE EXCEPTION 'No period covers date % for organization %', target_valid_on, target_org_id
      USING ERRCODE = 'R0001';
END IF;

  IF matched_status = 'closed' THEN
    RAISE EXCEPTION 'Journal entry % falls within a closed period and cannot be inserted, modified, or deleted',
      COALESCE(NEW.id, OLD.id)
      USING ERRCODE = 'R0001';
END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_entry_period_open
BEFORE INSERT OR UPDATE OR DELETE ON ledger.journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.check_journal_entry_period_open ();
