import { encodeWithCodecs } from "@usenullish/nullish-common";
import { getBunServer } from "hono/bun";
import { streamSSE } from "hono/streaming";
import { Chat, type ChatStreamEvent, MAX_CHAT_DURATION_SECONDS } from "@usenullish/nullish-chat";
import { ChatService, MessageService } from "@usenullish/nullish-engine/chat";
import { type Api, ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineStreamRoute } from "./_factories/stream-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { McpHandler } from "../mcp/mcp";
import { errorResponse, toApiError } from "../_errors";

const organizationIdOf = (domain: Api["Chat"]["Client"]["ChatDomain"]) =>
  domain.type === "organization" ? domain.organizationId : null;

const route = {
  path: "/chat",
  spec: { tag: "Chat" },
} as const;

const postChatRoute = defineStreamRoute({
  ...route,
  request: {
    body: {
      schema: ApiSchema.Chat.ChatRequestSchema,
    },
  },
  response: {
    description: "Streams the events of the chat as server-sent events",
  },
});

type PostChatRoute = typeof postChatRoute;

@ResourceProvider
export class ChatHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): ChatHandlers {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(postChatRoute, this.#chat);
  }

  #chat = async (context: OpenAPIHandlerContext<PostChatRoute>) => {
    const {
      req,
      var: {
        db: { connection },
        workers: { jobs },
        caller,
        llm: { meter },
      },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const { domain, conversationId, message } = req.valid("json");

    const { userId } = caller;

    const initialized = await ChatService.create({ db: connection, userId }).init({
      organizationId: organizationIdOf(domain),
      conversationId,
      message,
    });

    if (initialized.status === "error") {
      console.error(initialized.err);
      return errorResponse({
        context,
        ...toApiError({
          err: initialized.err,
          fallback: "Internal server error",
        }),
      });
    }

    const { conversation, history } = initialized.result;

    // Read only in two cases:
    // - without an organization (why: see packages/chat/AGENTS.md);
    // - for a reviewer, which the database also enforces through the membership rules.
    const readOnly =
      domain.type === "unscoped" ||
      caller.user.roles?.find(({ organizationId }) => organizationId === domain.organizationId)
        ?.role === "reviewer";

    const mcp = await McpHandler.create({
      db: connection,
      userId,
      jobs,
      readOnly,
    }).connect();

    if (mcp.status === "error") {
      console.error(mcp.err);
      return errorResponse({
        context,
        ...toApiError({ err: mcp.err, fallback: "Internal server error" }),
      });
    }

    const { result: client } = mcp;

    const messageService = MessageService.create({
      db: connection,
      userId,
      conversationId: conversation.id,
    });

    const recordUsage = async ({
      domain,
      usage: { model, inputTokens, outputTokens },
    }: {
      domain: Api["Chat"]["Client"]["ChatDomain"];
      usage: Extract<Api["Chat"]["Client"]["ChatEvent"], { type: "usage" }>;
    }) => {
      const result = await meter.record({
        usage: {
          organizationId: organizationIdOf(domain),
          conversationId: conversation.id,
          model,
          inputTokens,
          outputTokens,
        },
      });

      // TODO: observability?
      if (result.status === "error") {
        console.error(result.err);
      }
    };

    const recordMessage = async (values: Records["Chat"]["Messages"]["Insert"]) => {
      const result = await messageService.record({ message: values });

      if (result.status === "error") {
        console.error(result.err);
      }
    };

    const closeMeter = async () => {
      const result = await meter.close();

      // TODO: better logging?
      if (result.status === "error") {
        console.error(result.err);
      }
    };

    // Bun serve has a default of 10s timeout, that's why we are defining a longer timeout for this request.
    // https://bun.com/guides/http/sse
    // The chat itself gap the number of rounds. We set 5min - and not zero - as worst case scenario.
    const server = getBunServer<Bun.Server<undefined>>(context);
    server?.timeout(req.raw, MAX_CHAT_DURATION_SECONDS);

    return streamSSE(context, async (stream) => {
      const controller = new AbortController();

      // Keep intermediaries (reverse proxies, load balancers) from closing during long pause.
      const heartbeat = setInterval(() => {
        stream.write(": keep-alive\n\n");
      }, 15_000);

      stream.onAbort(() => {
        controller.abort();
      });

      try {
        // Send the conversation ID to the client
        const streamConversationId = async () => {
          await stream.writeSSE({
            event: "conversation",
            data: JSON.stringify(
              encodeWithCodecs({
                schema: ApiSchema.Chat.ChatEventSchema,
                value: {
                  type: "conversation",
                  conversationId: conversation.id,
                },
              }),
            ),
          });
        };

        await streamConversationId();

        // Send the events to the client and records message or usage into the DB
        const streamMessages = async ($event: ChatStreamEvent) => {
          if ($event.type === "message") {
            await recordMessage($event.message);
            return;
          }

          if ($event.type === "usage") {
            await recordUsage({ domain, usage: $event });
          }

          if ($event.type === "done" || $event.type === "error") {
            await closeMeter();
          }

          if (controller.signal.aborted) {
            return;
          }

          await stream.writeSSE({
            event: $event.type,
            data: JSON.stringify(
              encodeWithCodecs({ schema: ApiSchema.Chat.ChatEventSchema, value: $event }),
            ),
          });
        };

        for await (const $event of Chat.create({ mcp: client }).stream({
          domain,
          history,
          message,
          signal: controller.signal,
        })) {
          await streamMessages($event);
        }
      } finally {
        clearInterval(heartbeat);
        await client.close();
      }
    });
  };
}
