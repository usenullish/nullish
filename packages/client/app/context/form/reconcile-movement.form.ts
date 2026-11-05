import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { emptyStringToNull } from "@usenullish/nullish-common";
import * as z from "zod";
import { BankMovementsService } from "~/lib/services/bank-movements.services";

type BankMovementId = Api["BankMovements"]["Client"]["BankMovement"]["id"];
type InvoiceId = Api["Invoices"]["Client"]["Invoice"]["id"];

export const buildUseReconcileMovementWithInvoiceAction = ({
  bankMovementId,
  invoiceId,
}: {
  bankMovementId: BankMovementId;
  invoiceId: InvoiceId;
}): UseActionStateFn => {
  const useReconcileMovementWithInvoiceAction: UseActionStateFn = async () => {
    const result = await BankMovementsService.create().reconcile({
      bankMovementId,
      reconciliation: { type: "invoice", invoiceId },
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useReconcileMovementWithInvoiceAction;
};

const FormReconcileMovementWithAccountSchema =
  ApiSchema.BankMovementsReconcile.ReconcileBankMovementWithAccountRequestSchema.extend({
    description: emptyStringToNull(z.string().nullable()),
    vatRateId: emptyStringToNull(
      ApiSchema.BankMovementsReconcile.ReconcileBankMovementWithAccountRequestSchema.shape
        .vatRateId,
    ),
  });

export const buildUseReconcileMovementWithAccountAction = ({
  bankMovementId,
}: {
  bankMovementId: BankMovementId;
}): UseActionStateFn => {
  const useReconcileMovementWithAccountAction: UseActionStateFn = async (_prevState, formData) => {
    const reconciliation = FormReconcileMovementWithAccountSchema.parse({
      type: "account",
      accountId: formData.get("accountId"),
      description: formData.get("description"),
      vatRateId: formData.get("vatRateId"),
    });

    const result = await BankMovementsService.create().reconcile({
      bankMovementId,
      reconciliation,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useReconcileMovementWithAccountAction;
};

export const buildUseIgnoreMovementAction = ({
  bankMovementId,
}: {
  bankMovementId: BankMovementId;
}): UseActionStateFn => {
  const useIgnoreMovementAction: UseActionStateFn = async () => {
    const result = await BankMovementsService.create().ignore({ bankMovementId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useIgnoreMovementAction;
};
