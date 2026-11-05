-- A record can never be moved to a different organization once created.
CREATE OR REPLACE FUNCTION core.check_organization_immutable () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id cannot be changed once set (row %)', OLD.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
qualified_table text;
BEGIN
  FOREACH qualified_table IN ARRAY ARRAY[
    'core.memberships', 'core.accounting_settings', 'core.billing_settings', 'core.vat_settings', 'core.vat_rates', 'core.vat_periods', 'core.bank_relations', 'core.document_templates',
    'ledger.accounts', 'ledger.system_accounts', 'ledger.periods', 'ledger.journal_entries',
    'billing.clients', 'billing.invoices',
    'chat.conversations',
    'migration.migrations'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER enforce_organization_immutable BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION core.check_organization_immutable();',
      qualified_table
    );
END LOOP;
END;
$$;
