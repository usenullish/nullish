import { DbUserContext } from "@usenullish/nullish-db";
import { isNullish, type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { desc } from "drizzle-orm";
import type { DbStoreInitArgs } from "../../store";
import { findConversationById } from "../_helpers/conversations";
import { listMessages } from "../_helpers/messages";

type Conversation = Records["Chat"]["Conversations"]["Select"];
type Chat = Composites["Chat"]["Select"];

export class DbChat extends DbUserContext {
  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbChat {
    return new this(args);
  }

  find({ pKey: id }: { pKey: Conversation["id"] }): Promise<Result<Option<Chat>>> {
    return tryCatch(async () => {
      return await this._withAuth<Option<Chat>>(async (tx) => {
        const conversation = await findConversationById({ tx, id });

        if (isNullish(conversation)) {
          return undefined;
        }

        const messages = await listMessages({
          tx,
          conversationId: conversation.id,
          filters: { textOnly: true },
          pagination: { limit: QUERY_DEFAULT_PAGINATION, offset: 0 },
          orderBy: [desc(DbSchema.Chat.Messages.MessagesSchema.position)],
        });

        return { conversation, messages: messages.toReversed() };
      });
    });
  }
}
