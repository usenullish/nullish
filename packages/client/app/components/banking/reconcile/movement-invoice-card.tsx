import { useActionState, useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseReconcileMovementWithInvoiceAction } from "~/context/form/reconcile-movement.form";
import { useClients } from "~/context/contexts/clients.context";
import { MovementDetails } from "~/components/banking/reconcile/movement-details";
import { IgnoreMovement } from "~/components/banking/reconcile/ignore-movement";
import { Amount } from "~/components/core/amount";
import { Button } from "~/ui/components/button";
import { Card, CardContent } from "~/ui/components/card";
import { Separator } from "~/ui/components/separator";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

type BankMovement = Api["BankMovements"]["Client"]["BankMovement"];

export const MovementInvoiceCard = ({
  movement,
  invoiceSummary: { invoice, amounts },
  onDone,
  onRejectSuggestion,
}: {
  movement: BankMovement;
  invoiceSummary: Api["InvoiceSummaries"]["Client"]["InvoiceSummary"];
  onDone: (movementId: BankMovement["id"]) => void;
  onRejectSuggestion: (movementId: BankMovement["id"]) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const clients = useClients();
  const [ignoreOpen, setIgnoreOpen] = useState(false);

  const client = clients?.find(({ id }) => id === invoice.clientId);

  const paid = invoice.status === InvoiceStatus.PAID;

  const difference = amounts.balance.remaining - movement.amount;

  const reconcileAction = buildUseReconcileMovementWithInvoiceAction({
    bankMovementId: movement.id,
    invoiceId: invoice.id,
  });

  const bookAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await reconcileAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.bank_movements.toast.book_success });
        onDone(movement.id);
      }

      return state;
    },
    errorMsg: i18n.bank_movements.toast.book_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(bookAction, INIT_FORM_STATE);

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-3">
          <MovementDetails movement={movement} />

          <div className="mt-auto flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setIgnoreOpen(true)}
            >
              {i18n.bank_movements.action.ignore}
            </Button>
          </div>
        </div>

        <Separator className="mx-0 md:hidden" />
        <Separator
          orientation="vertical"
          className="mx-0 hidden md:block data-[orientation=vertical]:h-auto"
        />

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium">
            {i18n.bank_movements.label.invoice} {invoice.number} · {client?.name}
          </span>

          {paid ? (
            <p className="text-xs text-muted-foreground">{i18n.bank_movements.text.already_paid}</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">{i18n.bank_movements.label.amount}</dt>
              <dd className="tabular-nums">
                <Amount amount={amounts.balance.remaining} currencyCode={invoice.currency} />
              </dd>

              {difference !== 0n && (
                <>
                  <dt className="text-muted-foreground">
                    {difference > 0n
                      ? i18n.bank_movements.label.remaining
                      : i18n.bank_movements.label.overpaid}
                  </dt>
                  <dd className="tabular-nums">
                    <Amount
                      amount={difference > 0n ? difference : -difference}
                      currencyCode={invoice.currency}
                    />
                  </dd>
                </>
              )}
            </dl>
          )}

          <div className="mt-auto flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onRejectSuggestion(movement.id)}
            >
              {i18n.bank_movements.action.not_this_invoice}
            </Button>

            {!paid && (
              <form onSubmit={buildFormSubmit({ onAction })}>
                <Button type="submit" disabled={pending}>
                  {pending
                    ? i18n.bank_movements.state.booking
                    : i18n.bank_movements.action.book_payment}
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardContent>

      <IgnoreMovement
        bankMovementId={movement.id}
        open={ignoreOpen}
        onOpenChange={setIgnoreOpen}
        onIgnored={() => onDone(movement.id)}
      />
    </Card>
  );
};
