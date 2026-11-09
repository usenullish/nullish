import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import {
  type VatRateDefaults,
  VatRateFields,
} from "~/components/settings/vat/rates/form/vat-rate-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const NewVatRateForm = ({
  onAction,
  pending,
  defaults,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  defaults?: VatRateDefaults;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <VatRateFields defaults={defaults} />

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.vatRate.submit)}>
            {pending ? i18n.vat.state.creating : i18n.vat.action.rate_create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
