import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ConversationsSchema } from "../../../db/schemas/chat/conversations";
import {
  INSERT_OMIT_FIELDS,
  UPDATE_OMIT_FIELDS,
  UPDATE_REQUIRED_FIELDS,
} from "../../../primitives";

export const SelectConversationsSchema = createSelectSchema(ConversationsSchema);
export const InsertConversationsSchema = createInsertSchema(ConversationsSchema).omit({
  ...INSERT_OMIT_FIELDS,
  userId: true,
});
export const UpdateConversationsSchema = createUpdateSchema(ConversationsSchema)
  .omit({
    ...UPDATE_OMIT_FIELDS,
    userId: true,
  })
  .partial()
  .required(UPDATE_REQUIRED_FIELDS);
