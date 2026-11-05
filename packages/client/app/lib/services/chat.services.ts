import type { Api } from "@usenullish/nullish-schema/server";
import { ApiChat } from "~/lib/api/chat.api";
import { Service } from "./_services";

export type ChatServiceEvent = Api["Chat"]["Client"]["ChatEvent"] | { type: "limit_reached" };

const TOO_MANY_REQUESTS = 429;

export class ChatService extends Service {
  private constructor() {
    super();
  }

  static create(): ChatService {
    return new this();
  }

  stream = (body: Api["Chat"]["Client"]["ChatRequest"]): AsyncGenerator<ChatServiceEvent> =>
    this.#stream(body);

  async *#stream(body: Api["Chat"]["Client"]["ChatRequest"]): AsyncGenerator<ChatServiceEvent> {
    try {
      yield* ApiChat.create().stream({ body });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.cause instanceof Response &&
        err.cause.status === TOO_MANY_REQUESTS
      ) {
        yield { type: "limit_reached" };
        return;
      }

      console.error(err);
      yield { type: "error", message: "The assistant is not available." };
    }
  }
}
