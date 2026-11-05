import { DbCollectionInvoices, DbInvoices } from "@usenullish/nullish-engine/billing";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import { ApiSchema, CommonSchema, encodeInvoiceResponse } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import {
  DELETE_TOOL,
  WRITE_TOOL,
  READ_ONLY_TOOL,
  McpTools,
  type McpToolsInitArgs,
  UPDATE_TOOL,
} from "./_tools";

type SelectInvoices = Records["Billing"]["Invoices"]["Select"];
type FilterInvoices = Records["Billing"]["Invoices"]["Filter"];

export class McpToolsInvoices extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsInvoices {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListInvoices();
    this.#registerGetInvoice();
  }

  override registerWriteTools() {
    this.#registerCreateInvoice();
    this.#registerUpdateInvoice();
    this.#registerDeleteInvoice();
  }

  #registerListInvoices() {
    this.registerTool({
      title: "list_invoices",
      annotations: READ_ONLY_TOOL,
      description: "Returns the invoices of an organization.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Invoices.GetInvoicesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Invoices.GetInvoicesResponseSchema),
      fn: async ({ organizationId, query, filters }) => {
        const store: DbCollectionStore<SelectInvoices, unknown, string, FilterInvoices> =
          DbCollectionInvoices.create({
            ...this._args,
            foreignKeyId: organizationId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (invoices) => ({
          invoices: invoices.map(encodeInvoiceResponse),
        }));
      },
    });
  }

  #registerGetInvoice() {
    this.registerTool({
      title: "get_invoice",
      annotations: READ_ONLY_TOOL,
      description: "Returns an invoice by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Invoices.InvoiceSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Invoices.GetInvoiceResponseSchema),
      fn: async ({ id }) => {
        const result = await DbInvoices.create(this._args).find({ pKey: id });

        return this.mapResult(result, (invoice) => ({
          invoice: nonNullish(invoice) ? encodeInvoiceResponse(invoice) : invoice,
        }));
      },
    });
  }

  #registerCreateInvoice() {
    this.registerTool({
      title: "create_invoice",
      annotations: WRITE_TOOL,
      description: "Creates an invoice for an organization. The invoice is created as a draft.",
      inputSchema: z.strictObject({
        organizationId: ApiSchema.Organizations.OrganizationSchema.shape.id,
        values: ApiSchema.Invoices.CreateInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Invoices.CreateInvoiceResponseSchema),
      fn: async ({ organizationId, values }) => {
        const result = await DbCollectionInvoices.create({
          ...this._args,
          foreignKeyId: organizationId,
        }).insert({ values });

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }

  #registerUpdateInvoice() {
    this.registerTool({
      title: "update_invoice",
      annotations: UPDATE_TOOL,
      description:
        "Updates an invoice. The status cannot be changed here, use open_invoice, pay_invoice, void_invoice or write_off_invoice instead. The current version must be provided for optimistic locking.",
      inputSchema: z.strictObject({
        id: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.Invoices.UpdateInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Invoices.UpdateInvoiceResponseSchema),
      fn: async ({ id, values }) => {
        const result = await DbInvoices.create(this._args).update({ values, pKey: id });

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }

  #registerDeleteInvoice() {
    this.registerTool({
      title: "delete_invoice",
      annotations: DELETE_TOOL,
      description: "Deletes a draft invoice with its lines. Only drafts can be deleted.",
      inputSchema: z.strictObject({
        id: ApiSchema.Invoices.InvoiceSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Invoices.GetInvoiceResponseSchema),
      fn: async ({ id }) => {
        const result = await DbInvoices.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (invoice) => ({
          invoice: nonNullish(invoice) ? encodeInvoiceResponse(invoice) : invoice,
        }));
      },
    });
  }
}
