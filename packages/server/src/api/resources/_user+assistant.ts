import { encodeWithCodecs } from "@usenullish/nullish-common";
import { envLlmEnabled, envLlmChatModel } from "@usenullish/nullish-env";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse } from "../_errors";

const getRoute = defineGetRoute({
  spec: { tag: "User" },
  path: "/user/assistant",
  response: {
    body: { schema: ApiSchema.Assistant.GetAssistantResponseSchema },
    description:
      "Returns the assistant of the signed-in user: its models, null when it is not enabled",
  },
});

type GetRoute = typeof getRoute;

@ResourceProvider
export class UserAssistant extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [getRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): UserAssistant {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(getRoute, this.#get);
  }

  #get = (context: OpenAPIHandlerContext<GetRoute>) => {
    const {
      var: { caller },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    return context.json(
      encodeWithCodecs({
        schema: ApiSchema.Assistant.GetAssistantResponseSchema,
        value: {
          assistant: {
            models: envLlmEnabled() ? [{ model: envLlmChatModel() }] : null,
          },
        },
      }),
      200,
    );
  };
}
