import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ContactsSchema, ClientsSchema } from "../../../db/schemas/billing/clients";
import {
  INSERT_OMIT_FIELDS,
  ORGANIZATION_ID_OMIT_FIELD,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";
import * as z from "zod";
import { ClientType } from "../../../db";
import { NotEmptyStringSchema, VatNumberSchema } from "@usenullish/nullish-common";
import { AddressSchema } from "../_address";
import { CommunicationSchema } from "../_communication";

// Drizzle does not correctly infer the enum
const refineClientsEnums = {
  type: z.enum(ClientType),
};

const ClientNameSchema = z.string().trim().min(1).max(255);

export const SelectClientsSchema = createSelectSchema(ClientsSchema, refineClientsEnums);
export const InsertClientsSchema = createInsertSchema(ClientsSchema, refineClientsEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
  })
  .extend({
    name: ClientNameSchema,
    ...AddressSchema.shape,
    ...CommunicationSchema.shape,
    vatNumber: VatNumberSchema.nullish(),
  });
export const UpdateClientsSchema = createUpdateSchema(ClientsSchema, refineClientsEnums)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
  })
  .extend({
    name: ClientNameSchema,
    ...AddressSchema.shape,
    ...CommunicationSchema.shape,
    vatNumber: VatNumberSchema.nullish(),
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);

export const SelectContactsSchema = createSelectSchema(ContactsSchema).omit({
  ...ORGANIZATION_ID_OMIT_FIELD,
  clientId: true,
});
const ContactCommunicationSchema = CommunicationSchema.pick({ email: true, phone: true });

export const InsertContactsSchema = createInsertSchema(ContactsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
    clientId: true,
  })
  .extend(ContactCommunicationSchema.shape);
export const UpdateContactsSchema = createUpdateSchema(ContactsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...UPDATE_OMIT_FIELDS,
    clientId: true,
  })
  .extend(ContactCommunicationSchema.shape)
  .required(UPDATE_REQUIRED_FIELDS);

export const FilterClientsSchema = z.strictObject({
  type: refineClientsEnums.type.optional(),
  search: NotEmptyStringSchema.optional(),
});

export const FilterContactsSchema = z.strictObject({
  search: NotEmptyStringSchema.optional(),
});
