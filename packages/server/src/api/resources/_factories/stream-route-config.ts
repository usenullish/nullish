import { createRoute, z } from "@hono/zod-openapi";
import { buildRouteErrorResponses } from "./_route-config";
import type { RouteArgs } from "./_route-config";

export interface StreamRouteArgs<RequestBodySchema extends z.ZodType> extends RouteArgs {
  request: { body: { schema: RequestBodySchema } };
  response: { description: string };
}

export function defineStreamRoute<RequestBodySchema extends z.ZodType>({
  spec: { tag },
  path,
  request: {
    body: { schema: requestBodySchema },
  },
  response: { description },
}: StreamRouteArgs<RequestBodySchema>) {
  return createRoute({
    method: "post",
    path,
    tags: [tag],
    request: {
      body: {
        content: {
          "application/json": {
            schema: requestBodySchema,
          },
        },
        required: true,
      },
    },
    responses: {
      200: {
        content: {
          "text/event-stream": {
            schema: z.string(),
          },
        },
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
    },
  });
}
