import { type Result, withoutSpaces } from "@usenullish/nullish-common";
import { ClientsService } from "~/lib/services/clients.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { readClientFormFields } from "~/context/form/_client.form";

interface SubmitClientArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

type CreatedClient = Api["Clients"]["Client"]["CreateClientResponse"];

export const buildUseNewClientAction = ({
  organizationId,
}: Pick<SubmitClientArgs, "organizationId">): UseActionStateFn<CreatedClient> => {
  const useNewClientAction: UseActionStateFn<CreatedClient> = async (_prevState, formData) => {
    const result = await submitClient({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewClientAction;
};

const FormCreateClientSchema = ApiSchema.Clients.CreateClientRequestSchema.extend({
  phone: withoutSpaces(ApiSchema.Clients.CreateClientRequestSchema.shape.phone),
});

const submitClient = async ({
  formData,
  organizationId,
}: SubmitClientArgs): Promise<Result<CreatedClient>> => {
  const client = FormCreateClientSchema.parse(readClientFormFields({ formData }));

  return await ClientsService.create().submit({ organizationId, client });
};
