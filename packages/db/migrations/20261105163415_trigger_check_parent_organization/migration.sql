-- A child record belongs to the organization of its parent (e.g. a line to the organization of
-- its invoice). Since a parent never changes organization (see check_organization_immutable),
-- this also keeps the organization of the child immutable. The functions are static, one per
-- table, so that PL/pgSQL can cache the plan of the parent lookup.
-- billing.lines
CREATE OR REPLACE FUNCTION billing.check_lines_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM billing.invoices WHERE id = NEW.invoice_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent billing.invoices (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON billing.lines FOR EACH ROW
EXECUTE FUNCTION billing.check_lines_organization ();

-- billing.contacts
CREATE OR REPLACE FUNCTION billing.check_contacts_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM billing.clients WHERE id = NEW.client_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent billing.clients (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON billing.contacts FOR EACH ROW
EXECUTE FUNCTION billing.check_contacts_organization ();

-- billing.invoice_journal_entries
CREATE OR REPLACE FUNCTION billing.check_invoice_journal_entries_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM billing.invoices WHERE id = NEW.invoice_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent billing.invoices (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON billing.invoice_journal_entries FOR EACH ROW
EXECUTE FUNCTION billing.check_invoice_journal_entries_organization ();

-- core.template_contents
CREATE OR REPLACE FUNCTION core.check_template_contents_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM core.document_templates WHERE id = NEW.template_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent core.document_templates (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON core.template_contents FOR EACH ROW
EXECUTE FUNCTION core.check_template_contents_organization ();

-- core.vat_methods
CREATE OR REPLACE FUNCTION core.check_vat_methods_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM ledger.periods WHERE id = NEW.period_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent ledger.periods (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON core.vat_methods FOR EACH ROW
EXECUTE FUNCTION core.check_vat_methods_organization ();

-- ledger.postings
CREATE OR REPLACE FUNCTION ledger.check_postings_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM ledger.journal_entries WHERE id = NEW.journal_entry_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent ledger.journal_entries (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON ledger.postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_postings_organization ();

-- ledger.period_journal_entries
CREATE OR REPLACE FUNCTION ledger.check_period_journal_entries_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM ledger.periods WHERE id = NEW.period_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent ledger.periods (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON ledger.period_journal_entries FOR EACH ROW
EXECUTE FUNCTION ledger.check_period_journal_entries_organization ();

-- ledger.posting_manual_vat_postings
CREATE OR REPLACE FUNCTION ledger.check_posting_manual_vat_postings_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM ledger.postings WHERE id = NEW.posting_id)
    OR NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM ledger.postings WHERE id = NEW.vat_posting_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent ledger.postings (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON ledger.posting_manual_vat_postings FOR EACH ROW
EXECUTE FUNCTION ledger.check_posting_manual_vat_postings_organization ();

-- banking.movement_journal_entries
CREATE OR REPLACE FUNCTION banking.check_movement_journal_entries_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM banking.movements WHERE id = NEW.movement_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent banking.movements (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON banking.movement_journal_entries FOR EACH ROW
EXECUTE FUNCTION banking.check_movement_journal_entries_organization ();

-- migration.datasets
CREATE OR REPLACE FUNCTION migration.check_datasets_organization () RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM (SELECT organization_id FROM migration.migrations WHERE id = NEW.migration_id) THEN
    RAISE EXCEPTION 'organization_id must match the parent migration.migrations (row %)', NEW.id;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_parent_organization
BEFORE INSERT OR UPDATE ON migration.datasets FOR EACH ROW
EXECUTE FUNCTION migration.check_datasets_organization ();
