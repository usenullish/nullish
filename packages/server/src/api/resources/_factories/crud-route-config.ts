import { createRoute } from "@hono/zod-openapi";
import { CommonSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { nonNullish } from "@usenullish/nullish-common";
import { toJsonSchema } from "../../types/json-response";
import { buildRouteErrorResponses, type RouteArgs } from "./_route-config";

interface GetRouteArgs<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  RequestQuerySchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends RouteArgs {
  response: { body: { schema: ResponseBodySchema }; description: string };
  request?: {
    params: { schema: RequestParamsSchema };
    query?: { schema: RequestQuerySchema };
  };
}

interface ListRouteArgs<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  FiltersSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<{}>,
> extends RouteArgs {
  response: { body: { schema: ResponseBodySchema }; description: string };
  request?: {
    params?: { schema: RequestParamsSchema };
    query?: { filters?: { schema: FiltersSchema } };
  };
}

type GetByIdRouteArgs<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = GetRouteArgs<ResponseBodySchema, RequestParamsSchema>;

interface PostRouteArgs<
  RequestBodySchema extends z.ZodType,
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends RouteArgs {
  response: { body: { schema: ResponseBodySchema }; description: string };
  request: { body: { schema: RequestBodySchema }; params?: { schema: RequestParamsSchema } };
}

type PatchRouteArgs<
  RequestBodySchema extends z.ZodType,
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = PostRouteArgs<RequestBodySchema, ResponseBodySchema, RequestParamsSchema>;

export function defineGetRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  RequestQuerySchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
  request,
}: GetRouteArgs<ResponseBodySchema, RequestParamsSchema, RequestQuerySchema>) {
  return createRoute({
    method: "get",
    path,
    tags: [tag],
    ...(nonNullish(request) && {
      request: {
        params: request.params.schema,
        ...(nonNullish(request.query) && {
          query: request.query.schema,
        }),
      },
    }),
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
}

export function defineListRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  FiltersSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<{}>,
>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
  request,
}: ListRouteArgs<ResponseBodySchema, RequestParamsSchema, FiltersSchema>) {
  const params = request?.params;
  const filters = request?.query?.filters;

  return createRoute({
    method: "get",
    path,
    tags: [tag],
    request: {
      ...(nonNullish(params) && {
        params: params.schema,
      }),
      query: nonNullish(filters)
        ? CommonSchema.Query.ListQueryParamsSchema.extend(filters.schema.shape)
        : CommonSchema.Query.ListQueryParamsSchema,
    },
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
}

export function defineGetByIdRoute<
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
  request,
}: GetByIdRouteArgs<ResponseBodySchema, RequestParamsSchema>) {
  return createRoute({
    method: "get",
    path: `${path}/{id}`,
    tags: [tag],
    request: {
      params: request?.params.schema ?? CommonSchema.Params.RouteIdParamsSchema,
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: responseBodySchema,
          },
        },
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
      404: {
        content: {
          "application/json": {
            schema: CommonSchema.Error.ErrorSchema,
          },
        },
        description: "Not Found",
      },
    },
  });
}

export function definePostRoute<
  RequestBodySchema extends z.ZodType,
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
  request: {
    body: { schema: requestBodySchema },
    params: requestParams,
  },
}: PostRouteArgs<RequestBodySchema, ResponseBodySchema, RequestParamsSchema>) {
  return createRoute({
    method: "post",
    path,
    tags: [tag],
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
    responses: {
      201: {
        content: {
          "application/json": {
            schema: responseBodySchema,
          },
        },
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
    },
  });
}

export function definePatchRoute<
  RequestBodySchema extends z.ZodType,
  ResponseBodySchema extends z.ZodType,
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: {
    body: { schema: responseBodySchema },
    description,
  },
  request: {
    body: { schema: requestBodySchema },
    params: requestParams,
  },
}: PatchRouteArgs<RequestBodySchema, ResponseBodySchema, RequestParamsSchema>) {
  return createRoute({
    method: "patch",
    path: `${path}/{id}`,
    tags: [tag],
    request: {
      params: requestParams?.schema ?? CommonSchema.Params.RouteIdParamsSchema,
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
          "application/json": {
            schema: responseBodySchema,
          },
        },
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
    },
  });
}

interface DeleteRouteArgs<
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> extends RouteArgs {
  response: { description: string };
  request?: { params: { schema: RequestParamsSchema } };
}

export function defineDeleteRoute<
  RequestParamsSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
>({
  spec: { tag },
  path,
  response: { description },
  request,
}: DeleteRouteArgs<RequestParamsSchema>) {
  return createRoute({
    method: "delete",
    path: `${path}/{id}`,
    tags: [tag],
    request: {
      params: request?.params.schema ?? CommonSchema.Params.RouteIdParamsSchema,
    },
    responses: {
      204: {
        description,
      },
      ...buildRouteErrorResponses({ spec: { tag } }),
      404: {
        content: {
          "application/json": {
            schema: CommonSchema.Error.ErrorSchema,
          },
        },
        description: "Not Found",
      },
    },
  });
}
