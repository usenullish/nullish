import { withoutSpaces } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { OrganizationsService } from "~/lib/services/organizations.services";
import { readOrganizationFormFields } from "~/context/form/_organization.form";

const FormOrganizationEditSchema = ApiSchema.Organizations.UpdateOrganizationRequestSchema.extend({
  version: z.coerce.number(),
  phone: withoutSpaces(ApiSchema.Organizations.UpdateOrganizationRequestSchema.shape.phone),
});

export const buildUseOrganizationEditAction = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): UseActionStateFn => {
  const useOrganizationEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormOrganizationEditSchema.parse({
      ...readOrganizationFormFields({ formData }),
      version: formData.get("version"),
    });

    const result = await OrganizationsService.create().update({ orgId: organizationId, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useOrganizationEditAction;
};
