import { InvoicesService } from "~/lib/services/invoices.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api } from "@usenullish/nullish-schema/server";

interface SubmitInvoiceArgs {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
}

export const buildUseUncollectibleInvoiceAction = ({
  invoiceId,
}: SubmitInvoiceArgs): UseActionStateFn => {
  const useUncollectibleInvoiceAction: UseActionStateFn = async (_prevState) => {
    const result = await InvoicesService.create().writeOff({
      invoiceId,
      args: { validOn: null },
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useUncollectibleInvoiceAction;
};
