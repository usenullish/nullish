import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { OrganizationFields } from "~/components/settings/organizations/form/organization-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const NewOrganizationForm = ({
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
        <OrganizationFields />

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.newOrganization.submit)}>
            {pending ? i18n.organizations.state.creating : i18n.organizations.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
