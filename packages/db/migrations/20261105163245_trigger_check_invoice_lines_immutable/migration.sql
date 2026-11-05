-- This row records a fact (this journal entry is this invoice's
-- opening/payment/void), never something to edit afterward.
CREATE OR REPLACE FUNCTION billing.check_invoice_journal_entries_immutable () RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Row % cannot be modified once created', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invoice_journal_entries_immutable
BEFORE UPDATE ON billing.invoice_journal_entries FOR EACH ROW
EXECUTE FUNCTION billing.check_invoice_journal_entries_immutable ();
