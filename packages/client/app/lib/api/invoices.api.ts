import { Api as AppApi } from "~/lib/api/_api";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import { API_URL } from "~/env";
import { encodeJsonBody } from "~/lib/utils/json";
import type { ApiWithInvoiceIdArgs } from "~/lib/api/_invoices";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";

export class ApiInvoices extends AppApi {
  static create(): ApiInvoices {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl });
  }

  submit = async ({
    body,
    orgId,
  }: {
    body: Api["Invoices"]["Client"]["CreateInvoiceBody"];
  } & ApiOrganizationsWritableArgs): Promise<
    Api["Invoices"]["Client"]["CreateInvoiceResponse"]
  > => {
    const response = await fetch(`${this.apiUrl}/organizations/${orgId}/billing/invoices`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.Invoices.CreateInvoiceRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/billing/invoices`,
      });
    }

    const result = await response.json();

    return ApiSchema.Invoices.CreateInvoiceResponseSchema.parse(result);
  };

  open = async ({
    invoiceId,
  }: ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["OpenInvoiceResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/open`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/open`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesOpen.OpenInvoiceResponseSchema.parse(result);
  };

  pay = async ({
    invoiceId,
    body,
  }: {
    body: Api["Invoices"]["Client"]["PayInvoiceBody"];
  } & ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["PayInvoiceResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/pay`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.InvoicesPay.PayInvoiceRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/pay`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesPay.PayInvoiceResponseSchema.parse(result);
  };

  void = async ({
    invoiceId,
    body,
  }: {
    body: Api["Invoices"]["Client"]["VoidInvoiceBody"];
  } & ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["VoidInvoiceResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/void`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.InvoicesVoid.VoidInvoiceRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/void`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesVoid.VoidInvoiceResponseSchema.parse(result);
  };

  writeOff = async ({
    invoiceId,
    body,
  }: {
    body: Api["Invoices"]["Client"]["UncollectibleInvoiceBody"];
  } & ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["UncollectibleInvoiceResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/uncollectible`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.InvoicesUncollectible.UncollectibleInvoiceRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/uncollectible`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesUncollectible.UncollectibleInvoiceResponseSchema.parse(result);
  };

  generatePdf = async ({
    invoiceId,
    body,
  }: {
    body: Api["Invoices"]["Client"]["GeneratePdfInvoiceBody"];
  } & ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["PdfInvoiceResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/pdf/generate`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: encodeJsonBody({
        schema: ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema,
        body,
      }),
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /billing/invoices/${invoiceId}/pdf/generate`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesPdf.PdfInvoiceResponseSchema.parse(result);
  };

  getPdfJobState = async ({
    invoiceId,
    jobId,
  }: {
    jobId: Api["Invoices"]["Client"]["PdfInvoiceResponse"]["jobId"];
  } & ApiWithInvoiceIdArgs): Promise<Api["Invoices"]["Client"]["PdfInvoiceJobStateResponse"]> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}/pdf/jobs/${jobId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /billing/invoices/${invoiceId}/pdf/jobs/${jobId}`,
      });
    }

    const result = await response.json();

    return ApiSchema.InvoicesPdf.PdfInvoiceJobStateResponseSchema.parse(result);
  };

  delete = async ({ invoiceId }: ApiWithInvoiceIdArgs): Promise<void> => {
    const response = await fetch(`${this.apiUrl}/billing/invoices/${invoiceId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot delete /billing/invoices/${invoiceId}`,
      });
    }
  };
}
