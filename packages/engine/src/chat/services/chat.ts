import { isNullish, type Nullish, type Result } from "@usenullish/nullish-common";
import { MessageRole, QUERY_MAX_PAGINATION } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { DbStoreInitArgs } from "../../store";
import { DbConversations } from "../records/conversations";
import { DbCollectionMessages } from "../records/messages";
import { DbOrganizations } from "../../core/records/organizations";
import { EngineError } from "../../errors";

type Conversation = Records["Chat"]["Conversations"]["Select"];
type ConversationId = Conversation["id"];
type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

type SelectMessages = Records["Chat"]["Messages"]["Select"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

class ConversationOrganizationNotFoundError extends EngineError {}
class ConversationNotFoundError extends EngineError {}
class ConversationOrganizationMismatchError extends EngineError {}

export interface InitializedConversation {
  conversation: Conversation;
  history: SelectMessages[];
}

export class ChatService {
  readonly #storeInitArgs: DbStoreInitArgs;

  // The title of a new conversation is initialized with the first message of the user, truncated to this length.
  readonly #CONVERSATION_TITLE_LENGTH = 100;

  private constructor(args: DbStoreInitArgs) {
    this.#storeInitArgs = args;
  }

  static create(args: DbStoreInitArgs): ChatService {
    return new this(args);
  }

  async init({
    organizationId,
    conversationId,
    message,
  }: {
    organizationId: Nullish<OrganizationId>;
    conversationId: Nullish<ConversationId>;
    message: string;
  }): Promise<Result<InitializedConversation>> {
    // If an organization is provided, ensure the user has the right to read it.
    const organization = await this.#getOrganizationIfProvided(organizationId);

    if (organization.status === "error") {
      return organization;
    }

    if (organization.result === undefined) {
      return {
        status: "error",
        err: new ConversationOrganizationNotFoundError(`Organization ${organizationId} not found`),
      };
    }

    return isNullish(conversationId)
      ? await this.#create({ organizationId, message })
      : await this.#resume({ organizationId, conversationId, message });
  }

  async #getOrganizationIfProvided(
    organizationId: Nullish<OrganizationId>,
  ): Promise<Result<Nullish<SelectOrganizations>>> {
    if (isNullish(organizationId)) {
      return { status: "success", result: null };
    }

    return await DbOrganizations.create(this.#storeInitArgs).find({
      pKey: organizationId,
    });
  }

  async #create({
    organizationId,
    message,
  }: {
    organizationId: Nullish<OrganizationId>;
    message: string;
  }): Promise<Result<InitializedConversation>> {
    const conversation = await DbConversations.create(this.#storeInitArgs).insert({
      values: {
        organizationId,
        title: message.slice(0, this.#CONVERSATION_TITLE_LENGTH),
      },
    });

    if (conversation.status === "error") {
      return conversation;
    }

    return await this.#buildInitializedConversation({
      conversation: conversation.result,
      history: [],
      message,
    });
  }

  async #resume({
    organizationId,
    conversationId,
    message,
  }: {
    organizationId: Nullish<OrganizationId>;
    conversationId: ConversationId;
    message: string;
  }): Promise<Result<InitializedConversation>> {
    const conversationResult = await DbConversations.create(this.#storeInitArgs).find({
      pKey: conversationId,
    });

    if (conversationResult.status === "error") {
      return conversationResult;
    }

    const { result: conversation } = conversationResult;

    if (isNullish(conversation)) {
      return {
        status: "error",
        err: new ConversationNotFoundError(`Conversation ${conversationId} not found`),
      };
    }

    if ((conversation.organizationId ?? null) !== (organizationId ?? null)) {
      return {
        status: "error",
        err: new ConversationOrganizationMismatchError(
          `Conversation ${conversationId} does not belong to this organization`,
        ),
      };
    }

    const historyResult = await DbCollectionMessages.create({
      ...this.#storeInitArgs,
      foreignKeyId: conversationId,
    }).list({
      pagination: { limit: QUERY_MAX_PAGINATION, offset: 0 },
      sort: { field: "position", direction: "desc" },
    });

    if (historyResult.status === "error") {
      return historyResult;
    }

    const { result: history } = historyResult;

    return await this.#buildInitializedConversation({
      conversation,
      history: history.toReversed(),
      message,
    });
  }

  async #buildInitializedConversation({
    conversation,
    history,
    message,
  }: {
    conversation: Conversation;
    history: SelectMessages[];
    message: string;
  }): Promise<Result<InitializedConversation>> {
    const userMessage = await this.#createUserMessage({
      conversationId: conversation.id,
      message,
    });

    if (userMessage.status === "error") {
      return userMessage;
    }

    return { status: "success", result: { conversation, history } };
  }

  async #createUserMessage({
    conversationId,
    message,
  }: {
    conversationId: ConversationId;
    message: string;
  }): Promise<Result<SelectMessages>> {
    return await DbCollectionMessages.create({
      ...this.#storeInitArgs,
      foreignKeyId: conversationId,
    }).insert({
      values: { role: MessageRole.USER, content: message },
    });
  }
}
