import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { VatMethodFields } from "~/components/settings/vat/methods/form/vat-method-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewVatMethodsForm = ({
  onAction,
  pending,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <VatMethodFields periods={periods} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.vat.state.creating : i18n.vat.action.methods_create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
