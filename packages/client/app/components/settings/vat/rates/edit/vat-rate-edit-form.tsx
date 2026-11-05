import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { VatRateFields } from "~/components/settings/vat/rates/form/vat-rate-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const VatRateEditForm = ({
  onAction,
  pending,
  rate,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  rate: Api["VatRates"]["Client"]["VatRate"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={rate.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.vat.text.rate_edit}</h1>

        <VatRateFields rate={rate} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
