import * as z from "zod";
import { RecordsSchema } from "../../records";

export const PreviewInvitationResponseSchema = z.strictObject({
  organizationName: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.shape.name,
});
