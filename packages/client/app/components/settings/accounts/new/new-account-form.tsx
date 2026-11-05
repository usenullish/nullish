import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { AccountFields } from "~/components/settings/accounts/form/account-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewAccountForm = ({
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
        <h1 className="text-xs font-medium">{i18n.accounts.text.create_title}</h1>

        <AccountFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.accounts.state.creating : i18n.accounts.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
