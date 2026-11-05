import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { InvitationsSchema } from "../../../db/schemas/core/invitations";
import { INSERT_OMIT_FIELDS, ORGANIZATION_ID_OMIT_FIELD } from "../../../primitives";

export const SelectInvitationsSchema = createSelectSchema(InvitationsSchema).omit({
  tokenHash: true,
});
export const InsertInvitationsSchema = createInsertSchema(InvitationsSchema)
  .omit({
    ...ORGANIZATION_ID_OMIT_FIELD,
    ...INSERT_OMIT_FIELDS,
    tokenHash: true,
    expiresAt: true,
  })
  .extend({
    email: z.email(),
  });
