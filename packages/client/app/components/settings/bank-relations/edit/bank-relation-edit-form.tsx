import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { BankRelationFields } from "~/components/settings/bank-relations/form/bank-relation-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const BankRelationEditForm = ({
  onAction,
  pending,
  bankRelation,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  bankRelation: Api["BankRelations"]["Client"]["BankRelation"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={bankRelation.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.bank_relations.text.edit_title}</h1>

        <BankRelationFields bankRelation={bankRelation} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
