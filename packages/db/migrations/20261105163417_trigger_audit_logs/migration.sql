-- Generic audit trigger: records every INSERT/UPDATE/DELETE on the listed
-- tables into audit.logs, capturing the full before/after row, the organization
-- of the record and who made the change (via auth.current_user_id()).
--
-- Every listed table has an organization_id, except core.organizations whose
-- id is the organization itself.
--
-- ⚠️ SECURITY DEFINER: this function runs with full database rights, not the
-- user's, because users can neither read nor write audit.logs themselves.
CREATE OR REPLACE FUNCTION audit.log_changes () RETURNS TRIGGER AS $$
DECLARE
v_old jsonb := CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END;
v_new jsonb := CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END;
BEGIN
INSERT INTO audit.logs (table_schema, table_name, record_id, organization_id, operation, old_data, new_data, user_id)
VALUES (
           TG_TABLE_SCHEMA,
           TG_TABLE_NAME,
           COALESCE(NEW.id, OLD.id),
           CASE
             WHEN TG_TABLE_SCHEMA = 'core' AND TG_TABLE_NAME = 'organizations' THEN COALESCE(NEW.id, OLD.id)
             ELSE (COALESCE(v_new, v_old) ->> 'organization_id')::uuid
           END,
           lower(TG_OP)::audit.log_operation_type,
           v_old,
           v_new,
           auth.current_user_id()
       );
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = '';

DO $$
DECLARE
qualified_table text;
BEGIN
  FOREACH qualified_table IN ARRAY ARRAY[
    'core.organizations', 'core.memberships', 'core.invitations', 'core.vat_settings', 'core.vat_methods', 'core.vat_rates', 'core.vat_periods', 'core.accounting_settings', 'core.billing_settings', 'core.bank_relations', 'core.document_templates', 'core.template_contents',
    'ledger.accounts', 'ledger.periods', 'ledger.journal_entries', 'ledger.postings', 'ledger.system_accounts', 'ledger.period_journal_entries', 'ledger.posting_manual_vat_postings',
    'billing.clients', 'billing.contacts', 'billing.invoices', 'billing.lines', 'billing.invoice_journal_entries',
    'banking.statements', 'banking.movements', 'banking.movement_journal_entries'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_log_trigger AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit.log_changes();',
      qualified_table
    );
END LOOP;
END;
$$;
