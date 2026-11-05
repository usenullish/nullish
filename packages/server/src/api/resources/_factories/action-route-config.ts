import { createRoute } from "@hono/zod-openapi";
import * as z from "zod";
import { nonNullish } from "@usenullish/nullish-common";
import { toJsonSchema } from "../../types/json-response";
import { buildRouteErrorResponses, type RouteArgs } from "./_route-config";

interface ActionRouteArgs<ResponseBodySchema extends z.ZodType> extends RouteArgs {
  response: { body: { schema: ResponseBodySchema }; description: string };
}

type ActionRouteWithoutRequestBodyArgs<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
> = ActionRouteArgs<ResponseBodySchema> & {
  request: Omit<RequestArgs<RequestParamsSchema>, "body">;
};

type ActionRouteWithRequestBodyArgs<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
  RequestBodySchema extends z.ZodType,
> = ActionRouteArgs<ResponseBodySchema> & {
  request: Omit<RequestArgs<RequestParamsSchema, RequestBodySchema>, "params"> &
    Partial<Pick<RequestArgs<RequestParamsSchema, RequestBodySchema>, "params">>;
};

interface RequestArgs<
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
  RequestBodySchema extends z.ZodType = z.ZodType,
> {
  params: { schema: RequestParamsSchema };
  body: { schema: RequestBodySchema };
}

const buildActionRoute = <ResponseBodySchema extends z.ZodType>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
}: ActionRouteArgs<ResponseBodySchema>) => ({
  method: "post" as const,
  path,
  tags: [tag],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: toJsonSchema(responseBodySchema),
        },
      },
      description,
    },
    ...buildRouteErrorResponses({ spec: { tag } }),
  },
});

export function defineActionWithoutRequestBodyRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
>({
  request: {
    params: { schema: requestParamsSchema },
  },
  ...rest
}: ActionRouteWithoutRequestBodyArgs<ResponseBodySchema, RequestParamsSchema>) {
  return createRoute({
    ...buildActionRoute(rest),
    request: {
      params: requestParamsSchema,
    },
  });
}

export function defineActionWithFormDataRequestBodyRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
  RequestBodySchema extends z.ZodType,
>({
  request: {
    params: requestParams,
    body: { schema: requestBodySchema },
  },
  ...rest
}: ActionRouteWithRequestBodyArgs<ResponseBodySchema, RequestParamsSchema, RequestBodySchema>) {
  return createRoute({
    ...buildActionRoute(rest),
    request: {
      ...(nonNullish(requestParams) && {
        params: requestParams.schema,
      }),
      body: {
        content: {
          "multipart/form-data": {
            schema: requestBodySchema,
          },
        },
        required: true,
      },
    },
  });
}

export function defineActionWithRequestBodyRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape>,
  RequestBodySchema extends z.ZodType,
>({
  request: {
    params: requestParams,
    body: { schema: requestBodySchema },
  },
  ...rest
}: ActionRouteWithRequestBodyArgs<ResponseBodySchema, RequestParamsSchema, RequestBodySchema>) {
  return createRoute({
    ...buildActionRoute(rest),
    request: {
      ...(nonNullish(requestParams) && {
        params: requestParams.schema,
      }),
      body: {
        content: {
          "application/json": {
            schema: requestBodySchema,
          },
        },
        required: true,
      },
    },
  });
}
