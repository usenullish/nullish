import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { AccountFields } from "~/components/settings/accounts/form/account-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const AccountEditForm = ({
  onAction,
  pending,
  account,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  account: Api["Accounts"]["Client"]["Account"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={account.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.accounts.text.edit_title}</h1>

        <AccountFields account={account} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
