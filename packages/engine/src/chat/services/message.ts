import type { Result } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import type { DbStoreInitArgs } from "../../store";
import { DbCollectionMessages } from "../records/messages";

type ConversationId = Records["Chat"]["Conversations"]["Select"]["id"];

type SelectMessages = Records["Chat"]["Messages"]["Select"];
type InsertMessages = Records["Chat"]["Messages"]["Insert"];

type MessageServiceArgs = DbStoreInitArgs & { conversationId: ConversationId };

export class MessageService {
  readonly #store: DbCollectionMessages;

  private constructor({ conversationId, ...rest }: MessageServiceArgs) {
    this.#store = DbCollectionMessages.create({ ...rest, foreignKeyId: conversationId });
  }

  static create(args: MessageServiceArgs): MessageService {
    return new this(args);
  }

  record({ message }: { message: InsertMessages }): Promise<Result<SelectMessages>> {
    return this.#store.insert({ values: message });
  }
}
