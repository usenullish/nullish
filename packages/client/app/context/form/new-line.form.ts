import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { createTokenSchema, type Result } from "@usenullish/nullish-common";
import { LinesService } from "~/lib/services/invoices+lines.services";
import * as z from "zod";
import { readDecimalsFormField } from "~/context/form/_decimals.form";

interface SubmitInvoiceArgs {
  formData: FormData;
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export const buildUseNewLineAction = ({
  invoiceId,
}: Pick<SubmitInvoiceArgs, "invoiceId">): UseActionStateFn => {
  const useAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitLine({ formData, invoiceId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useAction;
};

const FormCreateLineSchema = ApiSchema.Lines.CreateLineRequestSchema.extend({
  quantity: z.coerce.number(),
  unitPrice: z.coerce.bigint(),
});

const submitLine = async ({
  formData,
  invoiceId,
}: SubmitInvoiceArgs): Promise<Result<Api["InvoicesLines"]["Client"]["CreateLineResponse"]>> => {
  // TODO: kind of duplicate new-journal.form
  const tokenSchema = createTokenSchema({
    decimals: readDecimalsFormField({ formData, key: "decimals" }),
  });

  const getFormBigInt = (selector: string) => tokenSchema.parse(formData.get(selector));

  const line = FormCreateLineSchema.parse({
    type: formData.get("type"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unitPrice: getFormBigInt("unitPrice"),
  });

  return await LinesService.create().submit({ line, invoiceId });
};
