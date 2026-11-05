import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { ApiEnv } from "./api";
import * as z from "zod";

export type Response200<R extends RouteConfig> = R["responses"] extends {
  200: { content: { "application/json": { schema: infer S } } };
}
  ? S extends z.ZodType
    ? z.input<S>
    : never
  : never;

export type Response201<R extends RouteConfig> = R["responses"] extends {
  201: { content: { "application/json": { schema: infer S } } };
}
  ? S extends z.ZodType
    ? z.input<S>
    : never
  : never;

type ExtractJsonSchema<R extends RouteConfig> = R extends {
  request: {
    body: {
      content: {
        "application/json": {
          schema: infer S;
        };
      };
    };
  };
}
  ? S extends z.ZodType
    ? S
    : z.ZodUndefined
  : z.ZodUndefined;

export type RequestJson<R extends RouteConfig> = z.infer<ExtractJsonSchema<R>>;

export type OpenAPIHandlerContext<R extends RouteConfig, Env extends ApiEnv = ApiEnv> = Parameters<
  RouteHandler<
    R,
    Env,
    {
      in: { json: z.input<ExtractJsonSchema<R>> };
      out: { json: z.output<ExtractJsonSchema<R>> };
    }
  >
>[0];

type ExtractFormDataSchema<R extends RouteConfig> = R extends {
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: infer S;
        };
      };
    };
  };
}
  ? S extends z.ZodType
    ? S
    : z.ZodUndefined
  : z.ZodUndefined;

export type OpenAPIFormDataHandlerContext<
  R extends RouteConfig,
  Env extends ApiEnv = ApiEnv,
> = Parameters<
  RouteHandler<
    R,
    Env,
    {
      in: { form: z.input<ExtractFormDataSchema<R>> };
      out: { form: z.output<ExtractFormDataSchema<R>> };
    }
  >
>[0];

export type DefineOpenAPIHandler<R extends RouteConfig, Env extends ApiEnv = ApiEnv> = (
  context: OpenAPIHandlerContext<R, Env>,
) => Promise<Response>;
