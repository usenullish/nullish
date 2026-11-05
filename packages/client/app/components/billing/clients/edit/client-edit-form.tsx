import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { ClientFields } from "~/components/billing/clients/form/client-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const ClientEditForm = ({
  onAction,
  pending,
  client,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  client: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={client.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.clients.text.edit_title}</h1>

        <ClientFields client={client} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
