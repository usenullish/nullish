import { useActionState, useId, useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { toLocalDateString } from "@usenullish/nullish-common";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseReconcileMovementWithAccountAction } from "~/context/form/reconcile-movement.form";
import { MovementDetails } from "~/components/banking/reconcile/movement-details";
import { IgnoreMovement } from "~/components/banking/reconcile/ignore-movement";
import { AccountCombobox } from "~/components/settings/accounts/combobox/account-combobox";
import { Button } from "~/ui/components/button";
import { Card, CardContent } from "~/ui/components/card";
import { Separator } from "~/ui/components/separator";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { VatRateSelect } from "~/components/settings/vat/rates/select/vat-rate-select";
import { isVatRateUsableOn } from "~/kit/utils/vat-rates.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

type BankMovement = Api["BankMovements"]["Client"]["BankMovement"];
type VatRate = Api["VatRates"]["Client"]["VatRate"];

export const MovementAccountCard = ({
  movement,
  bankRelation,
  vatRates,
  vatMethods,
  periods,
  onDone,
}: {
  movement: BankMovement;
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
  vatRates: VatRate[];
  vatMethods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
  onDone: (movementId: BankMovement["id"]) => void;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const accountId = useId();
  const descriptionId = useId();
  const vatRateId = useId();
  const [ignoreOpen, setIgnoreOpen] = useState(false);

  const reconcileAction = buildUseReconcileMovementWithAccountAction({
    bankMovementId: movement.id,
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

  const bookedOn = toLocalDateString(movement.bookedOn);

  const validRates = vatRates.filter((rate) =>
    isVatRateUsableOn({ rate, date: bookedOn, vatMethods, periods }),
  );

  return (
    <Card>
      <form onSubmit={buildFormSubmit({ onAction })}>
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

          <div className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={accountId}>{i18n.bank_movements.label.account}</FieldLabel>
                <AccountCombobox
                  id={accountId}
                  name="accountId"
                  excludedAccountIds={[bankRelation.accountId]}
                  postableOnly
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={descriptionId}>
                  {i18n.bank_movements.label.description}
                </FieldLabel>
                <Input
                  id={descriptionId}
                  name="description"
                  defaultValue={movement.communication ?? movement.description ?? ""}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={vatRateId}>{i18n.bank_movements.label.vat_rate}</FieldLabel>
                <VatRateSelect
                  id={vatRateId}
                  name="vatRateId"
                  vatRates={validRates}
                  defaultValue={null}
                />
              </Field>
            </FieldGroup>

            <div className="mt-auto flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? i18n.bank_movements.state.booking : i18n.bank_movements.action.book}
              </Button>
            </div>
          </div>
        </CardContent>
      </form>

      <IgnoreMovement
        bankMovementId={movement.id}
        open={ignoreOpen}
        onOpenChange={setIgnoreOpen}
        onIgnored={() => onDone(movement.id)}
      />
    </Card>
  );
};
