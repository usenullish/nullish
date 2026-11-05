import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";

type Conversation = Records["Chat"]["Conversations"]["Select"];

export const findConversationById = async ({
  tx,
  id,
}: {
  tx: Tx;
  id: Conversation["id"];
}): Promise<Option<Conversation>> => {
  const conversations = await selectMany({
    tx,
    table: DbSchema.Chat.Conversations.ConversationsSchema,
    schema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
    where: eq(DbSchema.Chat.Conversations.ConversationsSchema.id, id),
  });

  assertArrayAtMostOne(conversations);

  const [conversation] = conversations;
  return conversation;
};
