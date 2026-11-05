import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { InvitationsService } from "~/lib/services/invitations.services";

type CreatedInvitation = Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"];

interface SubmitInvitationArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewInvitationAction = ({
  organizationId,
}: Pick<SubmitInvitationArgs, "organizationId">): UseActionStateFn<CreatedInvitation> => {
  const useNewInvitationAction: UseActionStateFn<CreatedInvitation> = async (
    _prevState,
    formData,
  ) => {
    const result = await submitInvitation({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewInvitationAction;
};

const submitInvitation = async ({
  formData,
  organizationId,
}: SubmitInvitationArgs): Promise<Result<CreatedInvitation>> => {
  const invitation = ApiSchema.InvitationsCreate.CreateInvitationRequestSchema.parse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  return await InvitationsService.create().submit({ organizationId, invitation });
};
