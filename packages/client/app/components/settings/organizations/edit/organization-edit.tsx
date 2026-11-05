import { useActionState } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseOrganizationEditAction } from "~/context/form/organization-edit.form";
import { OrganizationFields } from "~/components/settings/organizations/form/organization-fields";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { OrganizationDangerZone } from "~/components/settings/organizations/edit/organization-danger-zone";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";

export const OrganizationEdit = ({
  organization,
}: {
  organization: Api["Organizations"]["Client"]["Organization"];
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const { revalidate } = useRevalidator();
  const isAdmin = useIsOrganizationAdmin({ organizationId: organization.id });

  const organizationEditAction = buildUseOrganizationEditAction({
    organizationId: organization.id,
  });

  const editAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await organizationEditAction(prevState, formData);

      if (state.name === "ready") {
        await revalidate();
        notifySuccess({ msg: i18n.organizations.toast.update_success });
      }

      return state;
    },
    errorMsg: i18n.organizations.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(editAction, INIT_FORM_STATE);

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <form key={organization.version} onSubmit={buildFormSubmit({ onAction })}>
        <input type="hidden" name="version" value={organization.version} />

        <FieldGroup>
          <OrganizationFields organization={organization} />

          {isAdmin && (
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? i18n.core.state.saving : i18n.core.action.save}
              </Button>
            </Field>
          )}
        </FieldGroup>
      </form>

      <OrganizationDangerZone organization={organization} />
    </div>
  );
};
