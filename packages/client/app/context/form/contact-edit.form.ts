import { withoutSpaces } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { ContactsService } from "~/lib/services/clients+contacts.services";
import { readTextFormField } from "~/context/form/_contact-details.form";
import type { ApiContactsGetByIdArgs } from "~/lib/api/_clients";

const FormContactEditSchema = ApiSchema.Contacts.UpdateContactRequestSchema.extend({
  version: z.coerce.number(),
  phone: withoutSpaces(ApiSchema.Contacts.UpdateContactRequestSchema.shape.phone),
});

export const buildUseContactEditAction = ({ id }: ApiContactsGetByIdArgs): UseActionStateFn => {
  const useContactEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormContactEditSchema.parse({
      lastName: formData.get("lastName"),
      firstName: readTextFormField({ formData, key: "firstName" }),
      email: readTextFormField({ formData, key: "email" }),
      phone: readTextFormField({ formData, key: "phone" }),
      version: formData.get("version"),
    });

    const result = await ContactsService.create().update({ id, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useContactEditAction;
};
