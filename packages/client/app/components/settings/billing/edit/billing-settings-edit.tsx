import { useActionState, useId } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseBillingSettingsEditAction } from "~/context/form/billing-settings-edit.form";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { VatRateSelect } from "~/components/settings/vat/rates/select/vat-rate-select";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { WriteGuard } from "~/components/auth/guards/write-guard";

type VatRate = Api["VatRates"]["Client"]["VatRate"];
type BankRelation = Api["BankRelations"]["Client"]["BankRelation"];

export const BillingSettingsEdit = ({
  billingSettings,
  vatRates,
  bankRelations,
}: {
  billingSettings: Api["BillingSettings"]["Client"]["GetBillingSettingsResponse"]["settings"][number];
  vatRates: VatRate[];
  bankRelations: BankRelation[];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();
  const paymentTermDaysId = useId();
  const vatRateId = useId();
  const bankRelationId = useId();

  const bankRelationItems = [
    { value: null, label: i18n.billing.label.no_bank_relation },
    ...bankRelations.map(({ id, name }) => ({ value: id, label: name })),
  ];

  const billingSettingsEditAction = buildUseBillingSettingsEditAction({
    billingSettingId: billingSettings.id,
  });

  const editAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await billingSettingsEditAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.billing.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.billing.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(editAction, INIT_FORM_STATE);

  return (
    <form
      key={billingSettings.version}
      onSubmit={buildFormSubmit({ onAction })}
      className="mx-auto w-full max-w-2xl py-10"
    >
      <input type="hidden" name="version" value={billingSettings.version} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={paymentTermDaysId}>
            {i18n.billing.label.payment_term_days} <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id={paymentTermDaysId}
            name="paymentTermDays"
            type="number"
            min="0"
            step="1"
            defaultValue={billingSettings.paymentTermDays}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={vatRateId}>{i18n.billing.label.default_vat_rate}</FieldLabel>
          <VatRateSelect
            id={vatRateId}
            name="vatRateId"
            vatRates={vatRates}
            defaultValue={billingSettings.vatRateId}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={bankRelationId}>
            {i18n.billing.label.default_bank_relation}
          </FieldLabel>
          <Select
            items={bankRelationItems}
            name="bankRelationId"
            defaultValue={billingSettings.bankRelationId}
          >
            <SelectTrigger id={bankRelationId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bankRelationItems.map(({ value, label }) => (
                <SelectItem key={value ?? ""} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <WriteGuard>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? i18n.core.state.saving : i18n.core.action.save}
            </Button>
          </Field>
        </WriteGuard>
      </FieldGroup>
    </form>
  );
};
