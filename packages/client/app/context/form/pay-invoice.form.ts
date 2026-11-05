import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { createTokenSchema, emptyStringToNull, type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { InvoicesService } from "~/lib/services/invoices.services";
import { readDecimalsFormField } from "~/context/form/_decimals.form";

interface SubmitInvoiceArgs {
  formData: FormData;
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export const buildUsePayInvoiceAction = ({
  invoiceId,
}: Pick<SubmitInvoiceArgs, "invoiceId">): UseActionStateFn => {
  const usePayInvoiceAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitPayInvoice({ formData, invoiceId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return usePayInvoiceAction;
};

const FormPayInvoiceArgsSchema = ApiSchema.InvoicesPay.PayInvoiceRequestSchema.extend({
  amount: z.coerce.bigint(),
  exchangeRate: z.coerce.number(),
  validOn: emptyStringToNull(z.coerce.date().nullable()),
  bankRelationId: emptyStringToNull(
    ApiSchema.InvoicesPay.PayInvoiceRequestSchema.shape.bankRelationId,
  ),
});

const submitPayInvoice = async ({
  formData,
  invoiceId,
}: SubmitInvoiceArgs): Promise<Result<Api["Invoices"]["Client"]["PayInvoiceResponse"]>> => {
  // TODO: kind of duplicate new-journal.form and new-inline-line.form
  const tokenSchema = createTokenSchema({
    decimals: readDecimalsFormField({ formData, key: "decimals" }),
  });

  const getFormBigInt = (selector: string) => tokenSchema.parse(formData.get(selector));

  const payment = FormPayInvoiceArgsSchema.parse({
    amount: getFormBigInt("amount"),
    exchangeRate: formData.get("exchangeRate"),
    currency: formData.get(`currency`),
    validOn: formData.get(`validOn`),
    bankRelationId: formData.get("bankRelationId"),
  });

  return await InvoicesService.create().pay({ invoiceId, payment });
};
