import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

const ClientsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
);

export const GetClientsResponseSchema = z.strictObject({
  data: z.array(ClientsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetClientResponseSchema = z.strictObject({
  client: ClientsResponseSchema.nullish(),
});
export const CreateClientResponseSchema = z.strictObject({
  client: ClientsResponseSchema,
});
export const UpdateClientResponseSchema = CreateClientResponseSchema;

export const GetClientsRequestSchema = RecordsSchema.Billing.ClientsSchema.SelectClientsSchema;
export const CreateClientRequestSchema = RecordsSchema.Billing.ClientsSchema.InsertClientsSchema;
export const UpdateClientRequestSchema = RecordsSchema.Billing.ClientsSchema.UpdateClientsSchema;

export const GetClientsFiltersSchema = RecordsSchema.Billing.ClientsSchema.FilterClientsSchema;
export const GetClientsFiltersQuerySchema = GetClientsFiltersSchema;
