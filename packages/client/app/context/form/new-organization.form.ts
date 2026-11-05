import { withoutSpaces } from "@usenullish/nullish-common";
import { OrganizationsService } from "~/lib/services/organizations.services";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { readOrganizationFormFields } from "~/context/form/_organization.form";

export type UseNewOrganizationResult = Pick<
  Api["Organizations"]["Client"]["Organization"],
  "id" | "name"
>;

const FormCreateOrganizationSchema = ApiSchema.Organizations.CreateOrganizationRequestSchema.extend(
  {
    phone: withoutSpaces(ApiSchema.Organizations.CreateOrganizationRequestSchema.shape.phone),
  },
);

export const useNewOrganizationAction: UseActionStateFn<UseNewOrganizationResult> = async (
  _prevState,
  formData,
) => {
  const organization = FormCreateOrganizationSchema.parse({
    ...readOrganizationFormFields({ formData }),
    legalForm: formData.get("legalForm"),
  });

  const result = await OrganizationsService.create().submit({ organization });

  if (result.status === "error") {
    return { name: "error" as const, err: result.err };
  }

  const { id, name } = result.result.organization;

  return { name: "ready" as const, result: { id, name } };
};
