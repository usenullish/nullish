import { createRoute, z } from "@hono/zod-openapi";
import { buildRouteErrorResponses } from "./_route-config";
import type { RouteArgs } from "./_route-config";

export interface DownloadRouteArgs<
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends RouteArgs {
  response: { description: string; contentType?: string };
  request?: { params: { schema: RequestParamsSchema } };
}

export function defineDownloadRoute<
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: { description, contentType = "application/pdf" },
  request,
}: DownloadRouteArgs<RequestParamsSchema>) {
  return createRoute({
    method: "get",
    path,
    tags: [tag],
    ...(request && {
      request: {
        params: request.params.schema,
      },
    }),
    responses: {
      200: {
        content: {
          [contentType]: {
            schema: z.string().openapi({
              type: "string",
              format: "binary",
            }),
          },
        },
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
    },
  });
}
