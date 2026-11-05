import { type Result, withoutSpaces } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { readTextFormField } from "~/context/form/_contact-details.form";
import { ContactsService } from "~/lib/services/clients+contacts.services";
import type { ApiWithClientIdArgs } from "~/lib/api/_clients";

interface SubmitContactArgs {
  formData: FormData;
  clientId: ApiWithClientIdArgs["clientId"];
}

export const buildUseNewContactAction = ({
  clientId,
}: Pick<SubmitContactArgs, "clientId">): UseActionStateFn => {
  const useNewContactAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitContact({ formData, clientId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewContactAction;
};

const FormCreateContactSchema = ApiSchema.Contacts.CreateContactRequestSchema.extend({
  phone: withoutSpaces(ApiSchema.Contacts.CreateContactRequestSchema.shape.phone),
});

const submitContact = async ({
  formData,
  clientId,
}: SubmitContactArgs): Promise<Result<Api["Contacts"]["Client"]["CreateContactResponse"]>> => {
  const contact = FormCreateContactSchema.parse({
    lastName: formData.get("lastName"),
    firstName: readTextFormField({ formData, key: "firstName" }),
    email: readTextFormField({ formData, key: "email" }),
    phone: readTextFormField({ formData, key: "phone" }),
  });

  return await ContactsService.create().submit({ clientId, contact });
};
