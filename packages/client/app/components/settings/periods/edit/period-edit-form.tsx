import type { Api } from "@usenullish/nullish-schema/server";
import { toLocalDateString } from "@usenullish/nullish-common";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { PeriodFields } from "~/components/settings/periods/form/period-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const PeriodEditForm = ({
  onAction,
  pending,
  period,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  period: Api["Periods"]["Client"]["Period"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={period.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.periods.text.edit}</h1>

        <PeriodFields
          defaultStartOn={toLocalDateString(period.startOn)}
          defaultEndOn={toLocalDateString(period.endOn)}
        />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
