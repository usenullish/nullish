import { RecordsSchema } from "../../records";
import * as z from "zod";
import { TimestampCodec } from "@usenullish/nullish-common";
import { withAuditFieldsCodecs } from "./_audit";

export const OrganizationSchema = withAuditFieldsCodecs(
  RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
).extend({
  deletedAt: TimestampCodec.nullable(),
});

export const GetOrganizationsResponseSchema = z.strictObject({
  organizations: z.array(OrganizationSchema),
});
export const GetOrganizationResponseSchema = z.strictObject({
  organization: OrganizationSchema.nullish(),
});
export const CreateOrganizationResponseSchema = z.strictObject({
  organization: OrganizationSchema,
});
export const UpdateOrganizationResponseSchema = CreateOrganizationResponseSchema;

export const GetOrganizationsRequestSchema =
  RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema;
export const CreateOrganizationRequestSchema =
  RecordsSchema.Core.OrganizationsSchema.InsertOrganizationsSchema;

export const UpdateOrganizationRequestSchema =
  RecordsSchema.Core.OrganizationsSchema.UpdateOrganizationsSchema;

export const GetOrganizationsFiltersSchema =
  RecordsSchema.Core.OrganizationsSchema.FilterOrganizationsSchema;
export const GetOrganizationsFiltersQuerySchema = GetOrganizationsFiltersSchema;
