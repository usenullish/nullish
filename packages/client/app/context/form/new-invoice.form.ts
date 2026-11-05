import { InvoicesService } from "~/lib/services/invoices.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { emptyStringToNull, type Result } from "@usenullish/nullish-common";
import * as z from "zod";

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

const FormCreateInvoiceSchema = ApiSchema.Invoices.CreateInvoiceRequestSchema.extend({
  issueOn: z.coerce.date(),
  dueOn: emptyStringToNull(z.coerce.date().nullable()),
  exchangeRate: z.coerce.number(),
  vatRateId: emptyStringToNull(z.uuid().nullable()),
});

const submitInvoice = async ({
  formData,
  organizationId,
}: SubmitInvoiceArgs): Promise<Result<CreatedInvoice>> => {
  const invoice = FormCreateInvoiceSchema.parse({
    clientId: formData.get("clientId"),
    issueOn: formData.get("issueOn"),
    dueOn: formData.get("dueOn"),
    exchangeRate: formData.get("exchangeRate"),
    currency: formData.get(`currency`),
    vatRateId: formData.get("vatRateId"),
  });

  return await InvoicesService.create().submit({ organizationId, invoice });
};
