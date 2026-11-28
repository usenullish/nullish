import { InvoicesService } from "~/lib/services/invoices.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { InvoiceFormFieldsSchema, readInvoiceFormFields } from "~/context/form/_invoice.form";

interface SubmitInvoiceArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

type CreatedInvoice = Api["Invoices"]["Client"]["CreateInvoiceResponse"];

export const buildUseNewInvoiceAction = ({
  organizationId,
}: Pick<SubmitInvoiceArgs, "organizationId">): UseActionStateFn<CreatedInvoice> => {
  const useNewInvoiceAction: UseActionStateFn<CreatedInvoice> = async (_prevState, formData) => {
    const result = await submitInvoice({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewInvoiceAction;
};

const FormCreateInvoiceSchema = ApiSchema.Invoices.CreateInvoiceRequestSchema.extend(
  InvoiceFormFieldsSchema.shape,
);

const submitInvoice = async ({
  formData,
  organizationId,
}: SubmitInvoiceArgs): Promise<Result<CreatedInvoice>> => {
  const invoice = FormCreateInvoiceSchema.parse(readInvoiceFormFields({ formData }));

  return await InvoicesService.create().submit({ organizationId, invoice });
};
