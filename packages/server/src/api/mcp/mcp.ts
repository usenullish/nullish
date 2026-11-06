// eslint-disable-next-line import/extensions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// eslint-disable-next-line import/extensions
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/extensions
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { version } from "../../../../../package.json";
import { StreamableHTTPTransport } from "@hono/mcp";
import type { Context } from "hono";
import { type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { McpToolsOrganizations } from "./_organizations";
import { McpToolsAccountingSettings } from "./_accounting-settings";
import { McpToolsBillingSettings } from "./_billing-settings";
import { McpToolsPeriods } from "./_periods";
import { McpToolsAccounts } from "./_accounts";
import { McpToolsSystemAccounts } from "./_accounts-system";
import { McpToolsVatSettings } from "./_vat-settings";
import { McpToolsVatMethods } from "./_vat-methods";
import { McpToolsVatRates } from "./_vat-rates";
import { McpToolsVatPeriods } from "./_vat-periods";
import { McpToolsDocumentTemplates } from "./_document-templates";
import { McpToolsTemplateContents } from "./_template-contents";
import { McpToolsBankRelations } from "./_bank-relations";
import { McpToolsBankMovements } from "./_bank-movements";
import { McpToolsBankRelationSummaries } from "./_bank-relation-summaries";
import { McpToolsOrganizationMembers } from "./_organization-members";
import { McpToolsInvitations } from "./_invitations";
import { McpToolsCurrencies } from "./_currencies";
import { McpToolsClients } from "./_clients";
import { McpToolsContacts } from "./_contacts";
import { McpToolsInvoices } from "./_invoices";
import { McpToolsInvoiceSummaries } from "./_invoice-summaries";
import { McpToolsJournalSummaries } from "./_journal-summaries";
import { McpToolsInvoicesLines } from "./_invoices-lines";
import { McpToolsInvoicesLifecycle } from "./_invoices-lifecycle";
import { McpToolsInvoicesPdf } from "./_invoices-pdf";
import { McpToolsJournal } from "./_journal";
import { McpToolsReports } from "./_reports";

type McpHandlerInitArgs = DbStoreInitArgs & { jobs: TriggerJobs; readOnly: boolean };

export class McpHandler {
  readonly #server: McpServer;

  private constructor() {
    this.#server = new McpServer({ name: "nullish", version });
  }

  static create(args: McpHandlerInitArgs): McpHandler {
    const instance = new this();
    instance.#registerTools(args);
    return instance;
  }

  #registerTools({ jobs, readOnly, ...args }: McpHandlerInitArgs) {
    const server = this.#server;

    const tools = [
      McpToolsOrganizations.create({ server, args, readOnly }),
      McpToolsOrganizationMembers.create({ server, args, readOnly }),
      McpToolsInvitations.create({ server, args, readOnly }),
      McpToolsAccountingSettings.create({ server, args, readOnly }),
      McpToolsBillingSettings.create({ server, args, readOnly }),
      McpToolsPeriods.create({ server, args, readOnly }),
      McpToolsAccounts.create({ server, args, readOnly }),
      McpToolsSystemAccounts.create({ server, args, readOnly }),
      McpToolsVatSettings.create({ server, args, readOnly }),
      McpToolsVatMethods.create({ server, args, readOnly }),
      McpToolsVatRates.create({ server, args, readOnly }),
      McpToolsVatPeriods.create({ server, args, readOnly }),
      McpToolsDocumentTemplates.create({ server, args, readOnly }),
      McpToolsTemplateContents.create({ server, args, readOnly }),
      McpToolsBankRelations.create({ server, args, readOnly }),
      McpToolsBankMovements.create({ server, args, readOnly }),
      McpToolsBankRelationSummaries.create({ server, args, readOnly }),
      McpToolsCurrencies.create({ server, args, readOnly }),
      McpToolsClients.create({ server, args, readOnly }),
      McpToolsContacts.create({ server, args, readOnly }),
      McpToolsInvoices.create({ server, args, readOnly }),
      McpToolsInvoiceSummaries.create({ server, args, readOnly }),
      McpToolsJournalSummaries.create({ server, args, readOnly }),
      McpToolsInvoicesLines.create({ server, args, readOnly }),
      McpToolsInvoicesLifecycle.create({ server, args, readOnly }),
      McpToolsInvoicesPdf.create({ server, args: { ...args, jobs }, readOnly }),
      McpToolsJournal.create({ server, args, readOnly }),
      McpToolsReports.create({ server, args, readOnly }),
    ];

    tools.forEach((tool) => tool.registerTools());
  }

  // In-process client, e.g. for the chat, which calls the tools without going through HTTP
  async connect(): Promise<Result<Client>> {
    return await tryCatch(async (): Promise<Client> => {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

      await this.#server.connect(serverTransport);

      const client = new Client({ name: "nullish", version });
      await client.connect(clientTransport);

      return client;
    });
  }

  async handleRequest({
    context,
    __useJsonResponseForTest__ = false,
  }: {
    context: Context;
    __useJsonResponseForTest__?: boolean;
  }): Promise<Result<Option<Response>>> {
    return await tryCatch(async (): Promise<Option<Response>> => {
      const transport = new StreamableHTTPTransport({
        // stateless mode: we don't need to share context across requests
        sessionIdGenerator: undefined,
        // returns simple json response is useful for testing purposes
        enableJsonResponse: __useJsonResponseForTest__,
      });

      await this.#server.connect(transport);

      return await transport.handleRequest(context);
    });
  }
}
