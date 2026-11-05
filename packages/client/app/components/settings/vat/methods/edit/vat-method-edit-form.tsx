import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { VatMethodFields } from "~/components/settings/vat/methods/form/vat-method-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const VatMethodEditForm = ({
  onAction,
  pending,
  method,
  periods,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  method: Api["VatMethods"]["Client"]["VatMethod"];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={method.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.vat.text.method_edit}</h1>

        <VatMethodFields method={method} periods={periods} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
