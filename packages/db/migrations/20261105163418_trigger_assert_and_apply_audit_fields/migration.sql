-- Audit fields
--
-- 1. Optimistic locking: a client wanting to update a row must
-- send back the version it last read (NEW.version, as sent by the client,
-- is compared against OLD.version, the row's actual current value). If
-- they don't match, someone else updated the row first, and the update is
-- rejected with an exception rather than silently affecting zero rows.
-- On success, the trigger increments the version.
--
-- 2. Last update time: On success, the trigger also sets updated_at to now.
--
-- Note: version and updated_at are modified regardless of what the client sent for either.
CREATE OR REPLACE FUNCTION core.assert_and_apply_audit_fields () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'Row % was modified concurrently (expected version %, current version %)',
      OLD.id, NEW.version, OLD.version
      USING ERRCODE = 'serialization_failure';
END IF;

  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to every table listed here that has a version column.
DO $$
DECLARE
qualified_table text;
BEGIN
  FOREACH qualified_table IN ARRAY ARRAY['core.organizations', 'core.memberships', 'core.invitations', 'core.currencies', 'core.vat_settings', 'core.vat_methods', 'core.vat_rates', 'core.vat_periods', 'core.accounting_settings', 'core.billing_settings', 'core.bank_relations', 'core.document_templates', 'core.template_contents',
          'ledger.accounts', 'ledger.periods', 'ledger.journal_entries', 'ledger.postings', 'ledger.system_accounts', 'ledger.period_journal_entries', 'ledger.posting_manual_vat_postings',
          'billing.clients', 'billing.contacts', 'billing.invoices', 'billing.lines', 'billing.invoice_journal_entries',
          'banking.statements', 'banking.movements', 'banking.movement_journal_entries',
          'templates.ledger_accounts', 'templates.vat_rates',
          'chat.conversations',
          'migration.migrations', 'migration.datasets']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER assert_and_apply_audit_fields_on_update BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION core.assert_and_apply_audit_fields();',
      qualified_table
    );
END LOOP;
END;
$$;
