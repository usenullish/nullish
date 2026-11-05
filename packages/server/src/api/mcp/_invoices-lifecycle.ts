import {
  OpenInvoiceService,
  PayInvoiceService,
  UncollectibleInvoiceService,
  VoidInvoiceService,
} from "@usenullish/nullish-engine/billing";
import { ApiSchema, encodeInvoiceResponse } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { toJsonSchema } from "../types/json-response";
import { DESTRUCTIVE_TOOL, McpTools, type McpToolsInitArgs } from "./_tools";

export class McpToolsInvoicesLifecycle extends McpTools {
  private constructor(args: McpToolsInitArgs) {
    super(args);
  }

  static create(args: McpToolsInitArgs): McpToolsInvoicesLifecycle {
    return new this(args);
  }

  override registerReadOnlyTools() {}

  override registerWriteTools() {
    this.#registerOpenInvoice();
    this.#registerPayInvoice();
    this.#registerVoidInvoice();
    this.#registerWriteOffInvoice();
  }

  #registerOpenInvoice() {
    this.registerTool({
      title: "open_invoice",
      annotations: DESTRUCTIVE_TOOL,
      description:
        "Finalizes a draft invoice: it becomes open (issued) and its receivable is booked in the journal.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoicesOpen.OpenInvoiceResponseSchema),
      fn: async ({ invoiceId }) => {
        const result = await OpenInvoiceService.create({ ...this._args, invoiceId }).open();

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }

  #registerPayInvoice() {
    this.registerTool({
      title: "pay_invoice",
      annotations: DESTRUCTIVE_TOOL,
      description:
        "Records the payment of an open invoice and books it in the journal. The amount is expressed in the smallest currency unit. Pass the bankRelationId of the bank account the money was received on to book it on its ledger account; without it, the payment is booked on the bank_account system account.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.InvoicesPay.PayInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoicesPay.PayInvoiceResponseSchema),
      fn: async ({ invoiceId, values }) => {
        const result = await PayInvoiceService.create({ ...this._args, invoiceId }).pay(values);

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }

  #registerVoidInvoice() {
    this.registerTool({
      title: "void_invoice",
      annotations: DESTRUCTIVE_TOOL,
      description: "Voids an open invoice and reverses its booking in the journal.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.InvoicesVoid.VoidInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(ApiSchema.InvoicesVoid.VoidInvoiceResponseSchema),
      fn: async ({ invoiceId, values }) => {
        const result = await VoidInvoiceService.create({ ...this._args, invoiceId }).void(values);

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }

  #registerWriteOffInvoice() {
    this.registerTool({
      title: "write_off_invoice",
      annotations: DESTRUCTIVE_TOOL,
      description: "Writes off an open invoice as uncollectible and books the loss in the journal.",
      inputSchema: z.strictObject({
        invoiceId: ApiSchema.Invoices.InvoiceSchema.shape.id,
        values: ApiSchema.InvoicesUncollectible.UncollectibleInvoiceRequestSchema,
      }),
      outputSchema: toJsonSchema(
        ApiSchema.InvoicesUncollectible.UncollectibleInvoiceResponseSchema,
      ),
      fn: async ({ invoiceId, values }) => {
        const result = await UncollectibleInvoiceService.create({
          ...this._args,
          invoiceId,
        }).writeOff(values);

        return this.mapResult(result, (invoice) => ({
          invoice: encodeInvoiceResponse(invoice),
        }));
      },
    });
  }
}
