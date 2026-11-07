import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { Hono } from "hono";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { CreateInvitationService } from "@usenullish/nullish-engine/core";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { and, eq } from "drizzle-orm";
import {
  AccountType,
  DbSchema,
  EXCHANGE_RATE_ONE,
  type PostgresDbInstance,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, type Nullish } from "@usenullish/nullish-common";
import { McpHandler } from "../../../src/api/mcp/mcp";
import {
  createClient,
  createDraftInvoice,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  waitFor,
} from "../../../../engine/tests/_test-utils";

interface ListedTool {
  name: string;
  inputSchema: { type: string };
  outputSchema?: { type: string };
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

interface ToolsListResponse {
  result: { tools: ListedTool[] };
}

interface ToolCallResponse<T> {
  result: {
    isError?: boolean;
    content: { type: string; text: string }[];
    structuredContent?: { result: T };
  };
}

const EXPECTED_TOOLS = [
  "list_organizations",
  "get_organization",
  "create_organization",
  "update_organization",
  "list_organization_members",
  "list_invitations",
  "list_accounting_settings",
  "get_accounting_setting",
  "update_accounting_setting",
  "list_billing_settings",
  "get_billing_setting",
  "update_billing_setting",
  "list_periods",
  "get_period",
  "create_period",
  "update_period",
  "close_period",
  "list_accounts",
  "get_account",
  "create_account",
  "update_account",
  "delete_account",
  "list_system_accounts",
  "get_system_account",
  "create_system_account",
  "update_system_account",
  "list_vat_settings",
  "get_vat_setting",
  "create_vat_setting",
  "update_vat_setting",
  "list_vat_methods",
  "get_vat_method",
  "create_vat_method",
  "update_vat_method",
  "list_vat_method_summaries",
  "list_vat_rates",
  "get_vat_rate",
  "create_vat_rate",
  "update_vat_rate",
  "list_vat_periods",
  "get_vat_period",
  "create_vat_period",
  "update_vat_period",
  "list_document_templates",
  "get_document_template",
  "create_document_template",
  "update_document_template",
  "delete_document_template",
  "list_template_contents",
  "get_template_content",
  "create_template_content",
  "update_template_content",
  "delete_template_content",
  "list_bank_relations",
  "get_bank_relation",
  "create_bank_relation",
  "update_bank_relation",
  "delete_bank_relation",
  "list_bank_movements",
  "get_bank_movement",
  "list_bank_movement_summaries",
  "reconcile_bank_movement",
  "ignore_bank_movement",
  "list_bank_relation_summaries",
  "list_currencies",
  "list_clients",
  "get_client",
  "create_client",
  "update_client",
  "delete_client",
  "list_contacts",
  "get_contact",
  "create_contact",
  "update_contact",
  "delete_contact",
  "list_invoices",
  "get_invoice",
  "create_invoice",
  "update_invoice",
  "delete_invoice",
  "list_invoice_summaries",
  "get_invoice_summary",
  "list_invoice_lines",
  "get_invoice_line",
  "create_invoice_line",
  "delete_invoice_line",
  "open_invoice",
  "pay_invoice",
  "void_invoice",
  "write_off_invoice",
  "generate_invoice_pdf",
  "get_invoice_pdf_job",
  "list_journal_entries",
  "get_journal_entry",
  "create_journal_entry",
  "update_journal_entry",
  "delete_journal_entry",
  "list_journal_summaries",
  "get_journal_summary",
  "get_account_balances",
  "get_balance_sheet",
  "get_income_statement",
  "get_account_ledger",
  "get_active_accounts",
  "get_vat_declaration",
];

const LIST_QUERY = { limit: 100, offset: 0, sort: "createdAt", direction: "asc" };

describe("mcp", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let orgId: string;
  let reportOrgId: string;
  let otherOrgId: string;
  let clientId: string;
  let otherClientId: string;
  let invoiceId: string;

  const request = async <T>({
    userId = TEST_USER_ID,
    readOnly = false,
    method,
    params,
  }: {
    userId?: DbStoreInitArgs["userId"];
    readOnly?: boolean;
    method: string;
    params?: Record<string, unknown>;
  }): Promise<T> => {
    const app = new Hono();

    app.post("/mcp", async (context) => {
      const result = await McpHandler.create({
        db,
        userId,
        jobs: {} as TriggerJobs,
        readOnly,
      }).handleRequest({ context, __useJsonResponseForTest__: true });

      if (result.status === "error") {
        throw result.err;
      }

      return result.result ?? context.body(null, 204);
    });

    const response = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });

    expect(response.status).toBe(200);

    return (await response.json()) as T;
  };

  const callTool = <T>({
    userId,
    name,
    args,
  }: {
    userId?: DbStoreInitArgs["userId"];
    name: string;
    args: Record<string, unknown>;
  }): Promise<ToolCallResponse<T>> =>
    request<ToolCallResponse<T>>({
      userId,
      method: "tools/call",
      params: { name, arguments: args },
    });

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;

    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    reportOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    clientId = await createClient(db, orgId);
    otherClientId = await createClient(db, otherOrgId);

    invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("tools/list", () => {
    test("lists every tool with an object input and output schema", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      expect(tools.map(({ name }) => name).toSorted()).toEqual(EXPECTED_TOOLS.toSorted());

      for (const tool of tools) {
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.outputSchema?.type).toBe("object");
      }
    });

    test("annotates list and get tools as read-only", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      const readOnly = tools
        .filter(({ annotations }) => annotations?.readOnlyHint === true)
        .map(({ name }) => name)
        .toSorted();

      const expected = EXPECTED_TOOLS.filter(
        (name) => name.startsWith("list_") || name.startsWith("get_"),
      ).toSorted();

      expect(readOnly).toEqual(expected);
    });

    test("annotates the updates, the deletions, the invoice lifecycle and the bank movement actions as destructive", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      const destructive = tools
        .filter(({ annotations }) => annotations?.destructiveHint === true)
        .map(({ name }) => name)
        .toSorted();

      const expected = [
        ...EXPECTED_TOOLS.filter((name) => name.startsWith("update_")),
        ...EXPECTED_TOOLS.filter((name) => name.startsWith("delete_")),
        "open_invoice",
        "pay_invoice",
        "void_invoice",
        "write_off_invoice",
        "close_period",
        "reconcile_bank_movement",
        "ignore_bank_movement",
      ].toSorted();

      expect(destructive).toEqual(expected);
    });

    test("annotates the updates as idempotent", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      const updates = tools.filter(({ name }) => name.startsWith("update_"));

      expect(updates.length).toBeGreaterThan(0);
      expect(updates.every(({ annotations }) => annotations?.idempotentHint === true)).toBeTrue();
    });

    test("annotates the deletions as idempotent", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      const deletions = tools.filter(({ name }) => name.startsWith("delete_"));

      expect(deletions.length).toBeGreaterThan(0);
      expect(deletions.every(({ annotations }) => annotations?.idempotentHint === true)).toBeTrue();
    });

    test("annotates the creations as additive writes", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      const creations = tools.filter(({ name }) => name.startsWith("create_"));

      expect(creations.length).toBeGreaterThan(0);
      expect(
        creations.every(
          ({ annotations }) =>
            annotations?.readOnlyHint === false && annotations.destructiveHint === false,
        ),
      ).toBeTrue();
    });

    test("annotates every tool as closed world", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list" });

      expect(tools.every(({ annotations }) => annotations?.openWorldHint === false)).toBeTrue();
    });
  });

  describe("read-only", () => {
    test("lists only the read-only tools", async () => {
      const {
        result: { tools },
      } = await request<ToolsListResponse>({ method: "tools/list", readOnly: true });

      const expected = EXPECTED_TOOLS.filter(
        (name) => name.startsWith("list_") || name.startsWith("get_"),
      ).toSorted();

      expect(tools.map(({ name }) => name).toSorted()).toEqual(expected);
      expect(tools.every(({ annotations }) => annotations?.readOnlyHint === true)).toBeTrue();
    });

    test("calls a read-only tool", async () => {
      const {
        result: { isError },
      } = await request<ToolCallResponse<unknown>>({
        method: "tools/call",
        readOnly: true,
        params: { name: "list_clients", arguments: { organizationId: orgId, query: LIST_QUERY } },
      });

      expect(isError).toBeFalsy();
    });

    test("refuses a write tool", async () => {
      const response = await request<{ result?: { isError?: boolean }; error?: unknown }>({
        method: "tools/call",
        readOnly: true,
        params: { name: "create_client", arguments: { organizationId: orgId, values: {} } },
      });

      expect(response.result?.isError === true || response.error !== undefined).toBeTrue();
    });
  });

  describe("tools/call", () => {
    test("lists the members of an organization to its admin", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ members: { userId: string; email: string; role: string }[] }>({
        name: "list_organization_members",
        args: { organizationId: orgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();
      expect(
        structuredContent?.result.members.map(({ userId, email, role }) => ({
          userId,
          email,
          role,
        })),
      ).toEqual([{ userId: TEST_USER_ID, email: `${TEST_USER_ID}@test.dev`, role: "admin" }]);
    });

    test("lists no member of an organization the user does not own", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ members: unknown[] }>({
        name: "list_organization_members",
        args: { organizationId: otherOrgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.members).toEqual([]);
    });

    test("lists the invitations of an organization to its admin", async () => {
      const created = await CreateInvitationService.create({
        db,
        userId: TEST_USER_ID,
        organizationId: orgId,
        values: { email: "mcp-invited@test.dev", role: "reviewer" },
      }).create();

      if (created.status === "error") {
        throw created.err;
      }

      const {
        result: { isError, structuredContent },
      } = await callTool<{
        invitations: {
          id: string;
          email: string;
          role: string;
          expiresAt: { __timestamp__: string };
        }[];
      }>({
        name: "list_invitations",
        args: { organizationId: orgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();

      const [invitation] = structuredContent?.result.invitations ?? [];

      expect(invitation?.id).toBe(created.result.invitation.id);
      expect(invitation?.email).toBe("mcp-invited@test.dev");
      expect(invitation?.role).toBe("reviewer");
      expect(typeof invitation?.expiresAt.__timestamp__).toBe("string");
      expect(invitation).not.toHaveProperty("tokenHash");
    });

    test("lists no invitation of an organization the user does not own", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ invitations: unknown[] }>({
        name: "list_invitations",
        args: { organizationId: otherOrgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invitations).toEqual([]);
    });

    test("lists the clients of an organization with encoded audit fields", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ clients: { id: string; createdAt: { __timestamp__: string } }[] }>({
        name: "list_clients",
        args: { organizationId: orgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();

      const clients = structuredContent?.result.clients ?? [];

      expect(clients.map(({ id }) => id)).toEqual([clientId]);
      expect(typeof clients[0]?.createdAt.__timestamp__).toBe("string");
    });

    test("does not list the clients of another user's organization", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ clients: unknown[] }>({
        name: "list_clients",
        args: { organizationId: otherOrgId, query: LIST_QUERY },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.clients).toEqual([]);
    });

    test("lists the invoices matching encoded filters", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ invoices: { id: string }[] }>({
        name: "list_invoices",
        args: {
          organizationId: orgId,
          query: LIST_QUERY,
          filters: {
            status: "draft",
            clientId,
            issueOnFrom: { __date__: "2026-01-01" },
            issueOnTo: { __date__: "2026-01-01" },
          },
        },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoices.map(({ id }) => id)).toEqual([invoiceId]);
    });

    test("lists no invoice when none matches the filters", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ invoices: unknown[] }>({
        name: "list_invoices",
        args: { organizationId: orgId, query: LIST_QUERY, filters: { status: "open" } },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoices).toEqual([]);
    });

    test("rejects filters that do not match their schema", async () => {
      const {
        result: { isError, content },
      } = await callTool({
        name: "list_invoices",
        args: { organizationId: orgId, query: LIST_QUERY, filters: { status: "archived" } },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toContain("filters.status");
    });

    test("gets an invoice with encoded dates", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{
        invoice: { id: string; status: string; issueOn: { __date__: string } };
      }>({
        name: "get_invoice",
        args: { id: invoiceId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoice.id).toBe(invoiceId);
      expect(structuredContent?.result.invoice.status).toBe("draft");
      expect(structuredContent?.result.invoice.issueOn).toEqual({ __date__: "2026-01-01" });
    });

    test("lists the invoice summaries matching encoded filters", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ invoiceSummaries: { invoice: { id: string } }[] }>({
        name: "list_invoice_summaries",
        args: {
          organizationId: orgId,
          query: LIST_QUERY,
          filters: { status: "draft", clientId },
        },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoiceSummaries.map(({ invoice: { id } }) => id)).toEqual([
        invoiceId,
      ]);
    });

    test("gets an invoice summary with its encoded amounts", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{
        invoiceSummary: {
          invoice: { id: string };
          amounts: Record<string, Record<string, { __bigint__: string }>>;
        };
      }>({
        name: "get_invoice_summary",
        args: { id: invoiceId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoiceSummary.invoice.id).toBe(invoiceId);
      expect(structuredContent?.result.invoiceSummary.amounts).toEqual({
        totals: {
          subtotal: { __bigint__: "0" },
          vat: { __bigint__: "0" },
          total: { __bigint__: "0" },
        },
        balance: {
          paid: { __bigint__: "0" },
          remaining: { __bigint__: "0" },
        },
      });
    });

    test("updates an invoice from encoded dates", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{
        invoice: { version: number; status: string; dueOn: { __date__: string } | null };
      }>({
        name: "update_invoice",
        args: { id: invoiceId, values: { version: 1, dueOn: { __date__: "2026-01-31" } } },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.invoice.dueOn).toEqual({ __date__: "2026-01-31" });
      expect(structuredContent?.result.invoice.status).toBe("draft");
      expect(structuredContent?.result.invoice.version).toBe(2);
    });

    test("gets no client for a client of another user's organization", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ client?: unknown }>({
        name: "get_client",
        args: { id: otherClientId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.client).toBeUndefined();
    });

    test("creates a period from encoded dates", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{
        period: {
          organizationId: string;
          startOn: { __date__: string };
          endOn: { __date__: string };
        };
      }>({
        name: "create_period",
        args: {
          organizationId: orgId,
          values: {
            status: "open",
            startOn: { __date__: "2026-01-01" },
            endOn: { __date__: "2026-12-31" },
          },
        },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.period.organizationId).toBe(orgId);
      expect(structuredContent?.result.period.startOn).toEqual({ __date__: "2026-01-01" });
      expect(structuredContent?.result.period.endOn).toEqual({ __date__: "2026-12-31" });
    });

    test("closes a period that is followed by another one", async () => {
      const closeOrgId = await createOrganization(db, TEST_USER_ID);

      const period = await callTool<{ period: { id: string } }>({
        name: "create_period",
        args: {
          organizationId: closeOrgId,
          values: {
            status: "open",
            startOn: { __date__: "2026-01-01" },
            endOn: { __date__: "2026-12-31" },
          },
        },
      });
      await callTool<{ period: { id: string } }>({
        name: "create_period",
        args: {
          organizationId: closeOrgId,
          values: {
            status: "open",
            startOn: { __date__: "2027-01-01" },
            endOn: { __date__: "2027-12-31" },
          },
        },
      });

      const periodId = period.result.structuredContent?.result.period.id;

      const {
        result: { isError, structuredContent },
      } = await callTool<{ period: { id: string; status: string } }>({
        name: "close_period",
        args: { periodId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.period.id).toBe(periodId);
      expect(structuredContent?.result.period.status).toBe("closed");
    });

    test("marks a period as closed without a next period with the status only mode", async () => {
      const closeOrgId = await createOrganization(db, TEST_USER_ID);

      const period = await callTool<{ period: { id: string } }>({
        name: "create_period",
        args: {
          organizationId: closeOrgId,
          values: {
            status: "open",
            startOn: { __date__: "2026-01-01" },
            endOn: { __date__: "2026-12-31" },
          },
        },
      });

      const periodId = period.result.structuredContent?.result.period.id;

      const {
        result: { isError, structuredContent },
      } = await callTool<{ period: { id: string; status: string } }>({
        name: "close_period",
        args: { periodId, mode: "status_only" },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.period.id).toBe(periodId);
      expect(structuredContent?.result.period.status).toBe("closed");
    });

    test("updates a client and bumps its version", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ client: { name: string; version: number } }>({
        name: "update_client",
        args: { id: clientId, values: { version: 1, name: "Updated Client" } },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.client.name).toBe("Updated Client");
      expect(structuredContent?.result.client.version).toBe(2);
    });

    test("deletes a client and returns it", async () => {
      const deletableId = await createClient(db, orgId);

      const {
        result: { isError, structuredContent },
      } = await callTool<{ client?: { id: string } }>({
        name: "delete_client",
        args: { id: deletableId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.client?.id).toBe(deletableId);

      const found = await callTool<{ client?: unknown }>({
        name: "get_client",
        args: { id: deletableId },
      });

      expect(found.result.structuredContent?.result.client).toBeUndefined();
    });

    test("deletes no client of another user's organization", async () => {
      const {
        result: { isError, structuredContent },
      } = await callTool<{ client?: unknown }>({
        name: "delete_client",
        args: { id: otherClientId },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.client).toBeUndefined();
    });

    test("reports the account balances of a journal entry created with encoded amounts", async () => {
      const assetAccountId = await leafAccountId(db, reportOrgId, AccountType.ASSET);
      const incomeAccountId = await leafAccountId(db, reportOrgId, AccountType.INCOME);

      const period = await callTool<{ period: { id: string } }>({
        name: "create_period",
        args: {
          organizationId: reportOrgId,
          values: {
            status: "open",
            startOn: { __date__: "2026-01-01" },
            endOn: { __date__: "2026-12-31" },
          },
        },
      });

      expect(period.result.isError).toBeFalsy();

      const entry = await callTool<{
        journalEntry: { postings: { debit: { __bigint__: string } }[] };
      }>({
        name: "create_journal_entry",
        args: {
          organizationId: reportOrgId,
          values: {
            entry: { validOn: { __date__: "2026-06-15" }, reference: "MCP-ENTRY" },
            postings: [
              {
                accountId: assetAccountId,
                description: "Debit side",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: { __bigint__: "1000" },
                credit: { __bigint__: "0" },
              },
              {
                accountId: incomeAccountId,
                description: "Credit side",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: { __bigint__: "0" },
                credit: { __bigint__: "1000" },
              },
            ],
          },
        },
      });

      expect(entry.result.isError).toBeFalsy();
      expect(
        entry.result.structuredContent?.result.journalEntry.postings.map(({ debit }) => debit),
      ).toContainEqual({ __bigint__: "1000" });

      type AccountBalances = {
        accountBalances: {
          accountId: string;
          totalDebit: { __bigint__: string };
        }[];
      };

      const periodId = period.result.structuredContent?.result.period.id;

      const balances = await waitFor(
        () =>
          callTool<AccountBalances>({
            name: "get_account_balances",
            args: { organizationId: reportOrgId, periodId },
          }),
        ({ result: { structuredContent } }) =>
          structuredContent?.result.accountBalances.some(
            ({ accountId, totalDebit }) =>
              accountId === assetAccountId && totalDebit.__bigint__ === "1000",
          ) === true,
      );

      expect(balances.result.isError).toBeFalsy();
    });
  });

  describe("journal VAT postings", () => {
    type EncodedPosting = {
      id: string;
      version: number;
      accountId: string;
      description: string | null;
      currency: string;
      exchangeRate: number;
      vatRateId: string | null;
      debit: { __bigint__: string };
      credit: { __bigint__: string };
    };

    type EncodedJournal = {
      journalEntry: {
        entry: { id: string; version: number; reference: string | null };
        postings: EncodedPosting[];
      };
    };

    let vatOrgId: string;
    let expenseId: string;
    let bankId: string;
    let taxPreMaterialId: string;
    let vatRateId: string;

    const systemAccountId = async (purpose: SystemAccountPurpose): Promise<string> => {
      const [row] = await db
        .select()
        .from(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema)
        .where(
          and(
            eq(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.organizationId, vatOrgId),
            eq(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.purpose, purpose),
          ),
        );
      assertNonNullish(row);
      return row.accountId;
    };

    const vatPostingIdsOf = async (journalEntryId: string): Promise<string[]> =>
      (
        await db
          .select({
            vatPostingId:
              DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema.vatPostingId,
          })
          .from(DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema)
          .innerJoin(
            DbSchema.Ledger.Journal.PostingsSchema,
            eq(
              DbSchema.Ledger.Journal.PostingsSchema.id,
              DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema.postingId,
            ),
          )
          .where(eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalEntryId))
      ).map(({ vatPostingId }) => vatPostingId);

    const generatedOf = async (journal: Nullish<EncodedJournal["journalEntry"]>) => {
      assertNonNullish(journal);
      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);

      return journal.postings
        .filter(({ id }) => vatPostingIds.includes(id))
        .map(({ accountId, debit, credit }) => ({ accountId, debit, credit }));
    };

    const createPurchase = () =>
      callTool<EncodedJournal>({
        name: "create_journal_entry",
        args: {
          organizationId: vatOrgId,
          values: {
            entry: { validOn: { __date__: "2026-06-15" }, reference: "MCP-PURCHASE" },
            postings: [
              {
                accountId: expenseId,
                description: "Purchase",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId,
                debit: { __bigint__: "10810" },
                credit: { __bigint__: "0" },
              },
              {
                accountId: bankId,
                description: "Purchase",
                currency: "CHF",
                exchangeRate: EXCHANGE_RATE_ONE,
                vatRateId: null,
                debit: { __bigint__: "0" },
                credit: { __bigint__: "10810" },
              },
            ],
          },
        },
      });

    beforeAll(async () => {
      vatOrgId = await createOrganization(db, TEST_USER_ID);

      const [period] = await db
        .insert(DbSchema.Ledger.Periods.PeriodsSchema)
        .values({
          organizationId: vatOrgId,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
        })
        .returning();
      assertNonNullish(period);

      await db.insert(DbSchema.Core.Vat.VatSettingsSchema).values({
        organizationId: vatOrgId,
        vatNumber: "CHE-123.456.789 MWST",
      });

      await db.insert(DbSchema.Core.Vat.VatMethodsSchema).values({
        organizationId: vatOrgId,
        periodId: period.id,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      const [rate] = await db
        .select()
        .from(DbSchema.Core.Vat.VatRatesSchema)
        .where(
          and(
            eq(DbSchema.Core.Vat.VatRatesSchema.organizationId, vatOrgId),
            eq(DbSchema.Core.Vat.VatRatesSchema.code, "VM81"),
          ),
        );
      assertNonNullish(rate);
      vatRateId = rate.id;

      expenseId = await systemAccountId(SystemAccountPurpose.DEFAULT_EXPENSE);
      bankId = await systemAccountId(SystemAccountPurpose.BANK_ACCOUNT);
      taxPreMaterialId = await systemAccountId(SystemAccountPurpose.TAX_PRE_MATERIAL);
    });

    test("creates a journal entry with the VAT postings of its input tax posting", async () => {
      const {
        result: { isError, structuredContent },
      } = await createPurchase();

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.journalEntry.postings).toHaveLength(4);
      expect(await generatedOf(structuredContent?.result.journalEntry)).toEqual([
        { accountId: taxPreMaterialId, debit: { __bigint__: "810" }, credit: { __bigint__: "0" } },
        { accountId: expenseId, debit: { __bigint__: "0" }, credit: { __bigint__: "810" } },
      ]);
    });

    test("updates a journal entry and generates its VAT postings again, ignoring those sent", async () => {
      const created = await createPurchase();
      const journal = created.result.structuredContent?.result.journalEntry;
      assertNonNullish(journal);

      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);

      const doubled = ({ __bigint__ }: { __bigint__: string }) => ({
        __bigint__: `${BigInt(__bigint__) * 2n}`,
      });

      const {
        result: { isError, structuredContent },
      } = await callTool<EncodedJournal>({
        name: "update_journal_entry",
        args: {
          id: journal.entry.id,
          values: {
            entry: {
              validOn: { __date__: "2026-06-15" },
              reference: journal.entry.reference,
              version: journal.entry.version,
            },
            postings: journal.postings.map(
              ({
                id,
                version,
                accountId,
                description,
                currency,
                exchangeRate,
                vatRateId: rateId,
                debit,
                credit,
              }) => ({
                id,
                version,
                accountId,
                description,
                currency,
                exchangeRate,
                vatRateId: rateId,
                debit: vatPostingIds.includes(id) ? debit : doubled(debit),
                credit: vatPostingIds.includes(id) ? credit : doubled(credit),
              }),
            ),
          },
        },
      });

      expect(isError).toBeFalsy();
      expect(structuredContent?.result.journalEntry.postings).toHaveLength(4);
      expect(await generatedOf(structuredContent?.result.journalEntry)).toEqual([
        { accountId: taxPreMaterialId, debit: { __bigint__: "1620" }, credit: { __bigint__: "0" } },
        { accountId: expenseId, debit: { __bigint__: "0" }, credit: { __bigint__: "1620" } },
      ]);
    });
  });

  describe("tools/call errors", () => {
    afterEach(() => {
      spyOn(console, "error").mockRestore();
    });

    test("exposes the message of an engine error", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const {
        result: { isError, content },
      } = await callTool({
        name: "void_invoice",
        args: { invoiceId, values: { validOn: null } },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toBe(
        `Unexpected status: Invoice ${invoiceId} is draft and not open`,
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("exposes why a period cannot be closed", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const closeOrgId = await createOrganization(db, TEST_USER_ID);

      const period = await callTool<{ period: { id: string } }>({
        name: "create_period",
        args: {
          organizationId: closeOrgId,
          values: {
            status: "open",
            startOn: { __date__: "2026-01-01" },
            endOn: { __date__: "2026-12-31" },
          },
        },
      });

      const periodId = period.result.structuredContent?.result.period.id;

      const {
        result: { isError, content },
      } = await callTool({
        name: "close_period",
        args: { periodId },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toBe(
        `Period ${periodId} cannot be closed before the next period is created`,
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("explains a version conflict", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const {
        result: { isError, content },
      } = await callTool({
        name: "update_client",
        args: { id: clientId, values: { version: 999, name: "Stale" } },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toBe(
        "The record was modified since it was read. Read it again to get its current version, then retry.",
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("hides the message of a refused delete", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const {
        result: { isError, content },
      } = await callTool({
        name: "delete_client",
        args: { id: clientId },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toBe("Failed to execute delete_client.");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test("hides the message of an unexpected error", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      const {
        result: { isError, content },
      } = await callTool({
        name: "update_client",
        args: { id: otherClientId, values: { version: 1, name: "Intruder" } },
      });

      expect(isError).toBeTrue();
      expect(content[0]?.text).toBe("Failed to execute update_client.");
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
