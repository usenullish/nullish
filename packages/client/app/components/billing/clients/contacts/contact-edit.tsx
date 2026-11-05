import { useActionState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { useLocation, useNavigate } from "react-router";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { ContactFields } from "~/components/billing/clients/contacts/contact-fields";
import { buildUseContactEditAction } from "~/context/form/contact-edit.form";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const ContactEdit = ({
  contact,
  clientPath,
}: {
  contact: NonNullable<Api["Contacts"]["Client"]["GetContactResponse"]["contact"]>;
  clientPath: string;
}) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const navigate = useNavigate();
  const location = useLocation();

  const editAction = buildUseContactEditAction({ id: contact.id });

  const editWithToastAction = useActionWithNotifyError({
    action: async (prevState, formData) => {
      const state = await editAction(prevState, formData);

      if (state.name === "ready") {
        notifySuccess({ msg: i18n.contacts.toast.update_success });

        await (location.key === "default" ? navigate(clientPath) : navigate(-1));
      }

      return state;
    },
    errorMsg: i18n.contacts.toast.update_error,
  });

  const [, onAction, pending] = useActionState<FormState, FormData>(
    editWithToastAction,
    INIT_FORM_STATE,
  );

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={contact.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.contacts.text.edit_title}</h1>

        <ContactFields contact={contact} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
