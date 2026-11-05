import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiInvoices } from "~/lib/api/invoices.api";
import type { ApiWithInvoiceIdArgs } from "~/lib/api/_invoices";
import { Service } from "./_services";

export class InvoicesService extends Service {
  private constructor() {
    super();
  }

  static create(): InvoicesService {
    return new this();
  }

  submit = async ({
    invoice,
    organizationId,
  }: {
    invoice: Api["Invoices"]["Client"]["CreateInvoiceBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["Invoices"]["Client"]["CreateInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().submit({
        body: invoice,
        orgId: organizationId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  open = async ({
    invoiceId,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  }): Promise<Result<Api["Invoices"]["Client"]["OpenInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().open({
        invoiceId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  pay = async ({
    invoiceId,
    payment: body,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    payment: Api["Invoices"]["Client"]["PayInvoiceBody"];
  }): Promise<Result<Api["Invoices"]["Client"]["PayInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().pay({
        invoiceId,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  void = async ({
    invoiceId,
    args: body,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    args: Api["Invoices"]["Client"]["VoidInvoiceBody"];
  }): Promise<Result<Api["Invoices"]["Client"]["VoidInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().void({
        invoiceId,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  writeOff = async ({
    invoiceId,
    args: body,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    args: Api["Invoices"]["Client"]["UncollectibleInvoiceBody"];
  }): Promise<Result<Api["Invoices"]["Client"]["UncollectibleInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().writeOff({
        invoiceId,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  generatePdf = async ({
    invoiceId,
    args: body,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    args: Api["Invoices"]["Client"]["GeneratePdfInvoiceBody"];
  }): Promise<Result<Api["Invoices"]["Client"]["PdfInvoiceResponse"]>> => {
    try {
      const result = await ApiInvoices.create().generatePdf({
        invoiceId,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  getPdfJobState = async ({
    invoiceId,
    jobId,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    jobId: Api["Invoices"]["Client"]["PdfInvoiceResponse"]["jobId"];
  }): Promise<Result<Api["Invoices"]["Client"]["PdfInvoiceJobStateResponse"]>> => {
    try {
      const result = await ApiInvoices.create().getPdfJobState({
        invoiceId,
        jobId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({ invoiceId }: ApiWithInvoiceIdArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiInvoices.create().delete({ invoiceId });
    });
  };
}
