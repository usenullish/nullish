import { InvoicesService } from "~/lib/services/invoices.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api } from "@usenullish/nullish-schema/server";

interface SubmitInvoiceArgs {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export const buildUseOpenInvoiceAction = ({ invoiceId }: SubmitInvoiceArgs): UseActionStateFn => {
  const useOpenInvoiceAction: UseActionStateFn = async (_prevState) => {
    const result = await InvoicesService.create().open({ invoiceId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useOpenInvoiceAction;
};
