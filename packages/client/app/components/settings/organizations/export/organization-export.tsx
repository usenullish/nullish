import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseExportAction } from "~/context/form/export.form";
import { OrganizationExportJobState } from "~/components/settings/organizations/export/organization-export-job-state";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldGroup } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const OrganizationExport = ({
  organization,
}: {
  organization: Api["Organizations"]["Client"]["Organization"];
}) => {
  const { i18n } = useI18n();

  const exportAction = useActionWithNotifyError({
    action: buildUseExportAction({ organizationId: organization.id }),
    errorMsg: i18n.organizations.toast.export_error,
  });

  const [state, onAction, pending] = useActionState<
    FormState<Api["Exports"]["Client"]["GenerateExportResponse"]>,
    FormData
  >(exportAction, INIT_FORM_STATE);

  if (state.name === "ready") {
    return (
      <OrganizationExportJobState organizationId={organization.id} jobId={state.result.jobId} />
    );
  }

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <FieldDescription>
          {replacePlaceholders(i18n.organizations.text.export_description, {
            "{name}": organization.name,
          })}
        </FieldDescription>

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.organizations.export)}>
            {pending ? i18n.organizations.state.exporting : i18n.organizations.action.export}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
