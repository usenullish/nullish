import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import type { UseActionStateFn } from "~/context/form/form";
import { InvoicesService } from "~/lib/services/invoices.services";
import { InvoiceFormFieldsSchema, readInvoiceFormFields } from "~/context/form/_invoice.form";
import type { ApiWithInvoiceIdArgs } from "~/lib/api/_invoices";

const FormInvoiceEditSchema = ApiSchema.Invoices.UpdateInvoiceRequestSchema.extend({
  ...InvoiceFormFieldsSchema.shape,
  version: z.coerce.number(),
});

export const buildUseInvoiceEditAction = ({
  invoiceId,
}: ApiWithInvoiceIdArgs): UseActionStateFn => {
  const useInvoiceEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormInvoiceEditSchema.parse({
      ...readInvoiceFormFields({ formData }),
      version: formData.get("version"),
    });

    const result = await InvoicesService.create().update({ invoiceId, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useInvoiceEditAction;
};
