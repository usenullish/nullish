import { withoutSpaces } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { ClientsService } from "~/lib/services/clients.services";
import { readClientFormFields } from "~/context/form/_client.form";
import type { ApiClientsGetByIdArgs } from "~/lib/api/_clients";

const FormClientEditSchema = ApiSchema.Clients.UpdateClientRequestSchema.extend({
  version: z.coerce.number(),
  phone: withoutSpaces(ApiSchema.Clients.UpdateClientRequestSchema.shape.phone),
});

export const buildUseClientEditAction = ({ id }: ApiClientsGetByIdArgs): UseActionStateFn => {
  const useClientEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormClientEditSchema.parse({
      ...readClientFormFields({ formData }),
      version: formData.get("version"),
    });

    const result = await ClientsService.create().update({ id, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useClientEditAction;
};
