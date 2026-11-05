import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema, MessageRole } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, isNotNull, lt, ne, type SQL } from "drizzle-orm";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";

type Conversation = Records["Chat"]["Conversations"]["Select"];
type Message = Records["Chat"]["Messages"]["Select"];
type FilterMessages = Records["Chat"]["Messages"]["Filter"];

export const buildMessagesWhere = ({ positionBefore, textOnly }: FilterMessages): Option<SQL> => {
  const messages = DbSchema.Chat.Messages.MessagesSchema;

  return and(
    nonNullish(positionBefore) ? lt(messages.position, positionBefore) : undefined,
    textOnly === true
      ? and(ne(messages.role, MessageRole.TOOL), isNotNull(messages.content))
      : undefined,
  );
};

export const listMessages = async ({
  tx,
  conversationId,
  filters,
  ...queryArgs
}: {
  tx: Tx;
  conversationId: Conversation["id"];
  filters: Option<FilterMessages>;
} & Required<SelectManyFilterArgs>): Promise<Message[]> =>
  await selectMany({
    tx,
    table: DbSchema.Chat.Messages.MessagesSchema,
    schema: RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema,
    where: and(
      eq(DbSchema.Chat.Messages.MessagesSchema.conversationId, conversationId),
      isNullish(filters) ? undefined : buildMessagesWhere(filters),
    ),
    ...queryArgs,
  });
