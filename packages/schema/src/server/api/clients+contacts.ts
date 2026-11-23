import { RecordsSchema } from "../../records";
import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { withAuditFieldsCodecs } from "./_audit";

const ContactsResponseSchema = withAuditFieldsCodecs(
  RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
);

export const GetContactsResponseSchema = z.strictObject({
  data: z.array(ContactsResponseSchema),
  pagination: PaginationResponseSchema.optional(),
});
export const GetContactResponseSchema = z.strictObject({
  contact: ContactsResponseSchema.nullish(),
});
export const CreateContactResponseSchema = z.strictObject({
  contact: ContactsResponseSchema,
});
export const UpdateContactResponseSchema = CreateContactResponseSchema;

export const GetContactsRequestSchema = RecordsSchema.Billing.ClientsSchema.SelectContactsSchema;
export const CreateContactRequestSchema = RecordsSchema.Billing.ClientsSchema.InsertContactsSchema;
export const UpdateContactRequestSchema = RecordsSchema.Billing.ClientsSchema.UpdateContactsSchema;

export const GetContactsFiltersSchema = RecordsSchema.Billing.ClientsSchema.FilterContactsSchema;
export const GetContactsFiltersQuerySchema = GetContactsFiltersSchema;
