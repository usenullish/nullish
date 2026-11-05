import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { AccountsSystemFields } from "~/components/settings/accounts-system/form/accounts-system-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewAccountsSystemForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.system_accounts.text.create_title}</h1>

        <AccountsSystemFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.system_accounts.state.creating : i18n.system_accounts.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
