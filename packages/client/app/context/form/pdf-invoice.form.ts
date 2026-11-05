import { InvoicesService } from "~/lib/services/invoices.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { emptyStringToNull, type Result } from "@usenullish/nullish-common";
import { DEFAULT_TEMPLATE } from "~/context/constants/templates.constants";

interface SubmitInvoiceArgs {
  formData: FormData;
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export const buildUsePdfInvoiceAction = ({
  invoiceId,
}: Pick<SubmitInvoiceArgs, "invoiceId">): UseActionStateFn<
  Api["Invoices"]["Client"]["PdfInvoiceResponse"]
> => {
  const useAction: UseActionStateFn<Api["Invoices"]["Client"]["PdfInvoiceResponse"]> = async (
    _prevState,
    formData,
  ) => {
    const result = await submitGeneratePdfInvoice({ invoiceId, formData });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useAction;
};

const FormPdfInvoiceSchema = ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema.extend({
  bankRelationId: emptyStringToNull(
    ApiSchema.InvoicesPdf.GeneratePdfInvoiceRequestSchema.shape.bankRelationId,
  ),
});

const submitGeneratePdfInvoice = async ({
  formData,
  invoiceId,
}: SubmitInvoiceArgs): Promise<Result<Api["Invoices"]["Client"]["PdfInvoiceResponse"]>> => {
  const args = FormPdfInvoiceSchema.parse({
    template:
      formData.get("template") === DEFAULT_TEMPLATE
        ? { type: DEFAULT_TEMPLATE, language: formData.get("language") }
        : { type: "custom", id: formData.get("templateId") },
    bankRelationId: formData.get("bankRelationId"),
  });

  return await InvoicesService.create().generatePdf({ invoiceId, args });
};
