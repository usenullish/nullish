import { DbCollectionLines, DbLines } from "@usenullish/nullish-engine/billing";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { BigIntCodec, nonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { DELETE_TOOL, WRITE_TOOL, READ_ONLY_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

type SelectLines = Records["Billing"]["Lines"]["Select"];
type FilterLines = Records["Billing"]["Lines"]["Filter"];

export class McpToolsInvoicesLines extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsInvoicesLines {
    return new this(args);
  }

  override registerReadOnlyTools() {
    this.#registerListInvoiceLines();
    this.#registerGetInvoiceLine();
  }

  override registerWriteTools() {
    this.#registerCreateInvoiceLine();
    this.#registerDeleteInvoiceLine();
  }

  #registerListInvoiceLines() {
    this.registerTool({
      title: "list_invoice_lines",
      annotations: READ_ONLY_TOOL,
      description: "Returns the invoice lines of an invoice.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        query: CommonSchema.Query.ListQuerySchema,
        filters: ApiSchema.Lines.GetLinesFiltersSchema.optional(),
      }),
      outputSchema: toJsonSchema(ApiSchema.Lines.GetLinesResponseSchema),
      fn: async ({ invoiceId, query, filters }) => {
        const store: DbCollectionStore<SelectLines, unknown, string, FilterLines> =
          DbCollectionLines.create({
            ...this._args,
            foreignKeyId: invoiceId,
          });

        const result = await store.list({ ...query, filters });

        return this.mapResult(result, (lines) => ({
          lines: lines.map(this.#encodeResponse),
        }));
      },
    });
  }

  #registerGetInvoiceLine() {
    this.registerTool({
      title: "get_invoice_line",
      annotations: READ_ONLY_TOOL,
      description: "Returns an invoice line by its ID.",
      inputSchema: z.strictObject({
        id: ApiSchema.Lines.GetLinesRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Lines.GetLineResponseSchema),
      fn: async ({ id }) => {
        const result = await DbLines.create(this._args).find({ pKey: id });

        return this.mapResult(result, (line) => ({
          line: nonNullish(line) ? this.#encodeResponse(line) : line,
        }));
      },
    });
  }

  #registerCreateInvoiceLine() {
    this.registerTool({
      title: "create_invoice_line",
      annotations: WRITE_TOOL,
      description: "Creates an invoice line for an invoice.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.Lines.CreateLineRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.Lines.CreateLineResponseSchema),
      fn: async ({ invoiceId, values }) => {
        const result = await DbCollectionLines.create({
          ...this._args,
          foreignKeyId: invoiceId,
        }).insert({ values });

        return this.mapResult(result, (line) => ({
          line: this.#encodeResponse(line),
        }));
      },
    });
  }

  #registerDeleteInvoiceLine() {
    this.registerTool({
      title: "delete_invoice_line",
      annotations: DELETE_TOOL,
      description: "Deletes a line of a draft invoice.",
      inputSchema: z.strictObject({
        id: ApiSchema.Lines.GetLinesRequestSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.Lines.GetLineResponseSchema),
      fn: async ({ id }) => {
        const result = await DbLines.create(this._args).delete({ pKey: id });

        return this.mapResult(result, (line) => ({
          line: nonNullish(line) ? this.#encodeResponse(line) : line,
        }));
      },
    });
  }

  #encodeResponse = (line: SelectLines) => ({
    ...encodeAuditFieldsResponse(line),
    unitPrice: encodeWithCodecs({ schema: BigIntCodec, value: line.unitPrice }),
  });
}
