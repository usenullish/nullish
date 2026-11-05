import { useActionState } from "react";
import { Navigate, useRevalidator } from "react-router";
import { NewOrganizationForm } from "~/components/settings/organizations/new/new-organization-form";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import {
  useNewOrganizationAction,
  type UseNewOrganizationResult,
} from "~/context/form/new-organization.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { authClient } from "@usenullish/nullish-auth/client";

export const NewOrganization = () => {
  const { i18n } = useI18n();

  const { revalidate } = useRevalidator();
  const { refetch } = authClient.useSession();

  const newOrganizationAction = useActionWithNotifyError<UseNewOrganizationResult>({
    action: async (prevState, formData) => {
      const state = await useNewOrganizationAction(prevState, formData);

      if (state.name === "ready") {
        // Revalidate to load data and refetch to update the user's membership
        await Promise.all([revalidate(), refetch()]);
      }

      return state;
    },
    errorMsg: i18n.organizations.toast.create_error,
  });

  const [state, onAction, pending] = useActionState<FormState<UseNewOrganizationResult>, FormData>(
    newOrganizationAction,
    INIT_FORM_STATE,
  );

  if (state.name === "ready") {
    return <Navigate to={`/orgs/${state.result.id}/setup/vat`} />;
  }

  return <NewOrganizationForm onAction={onAction} pending={pending} />;
};
