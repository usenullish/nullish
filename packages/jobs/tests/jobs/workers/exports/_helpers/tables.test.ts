import { afterAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { isNullish } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { TEST_USER_ID } from "../../../../_test-utils";
import { buildExportTables } from "../../../../../src/jobs/workers/exports/_helpers/tables";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const nameOf = (table: PgTable): string => {
  const { schema, name } = getTableConfig(table);
  return `${schema}.${name}`;
};

const tables = buildExportTables({
  storeArgs: { db, userId: TEST_USER_ID },
  organizationId: crypto.randomUUID(),
});

describe("buildExportTables", () => {
  afterAll(async () => {
    await client.close();
  });

  test("lists every table of the organization once", () => {
    const names = tables.flatMap(({ collection, childCollection }) => [
      nameOf(collection.table),
      ...(isNullish(childCollection) ? [] : [nameOf(childCollection.table)]),
    ]);

    expect(names.sort()).toEqual([
      "banking.movement_journal_entries",
      "banking.movements",
      "banking.statements",
      "billing.clients",
      "billing.contacts",
      "billing.invoice_journal_entries",
      "billing.invoices",
      "billing.lines",
      "core.accounting_settings",
      "core.bank_relations",
      "core.billing_settings",
      "core.vat_methods",
      "core.vat_periods",
      "core.vat_rates",
      "core.vat_settings",
      "ledger.accounts",
      "ledger.period_journal_entries",
      "ledger.periods",
      "ledger.posting_manual_vat_postings",
      "ledger.system_accounts",
    ]);
  });

  test("lists the contacts, the lines and the movements per parent", () => {
    const children = Object.fromEntries(
      tables.flatMap(({ collection, childCollection }) =>
        isNullish(childCollection)
          ? []
          : [[nameOf(collection.table), nameOf(childCollection.table)]],
      ),
    );

    expect(children).toEqual({
      "billing.clients": "billing.contacts",
      "billing.invoices": "billing.lines",
      "core.bank_relations": "banking.movements",
    });
  });
});
