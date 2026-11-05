import type { Context } from "hono";
import type { Option } from "@usenullish/nullish-common";
import type { ApiEnv } from "./api";
import * as z from "zod";

type JsonInputSchema<T extends z.ZodType> = {
  in: {
    json: z.input<T>;
  };
  out: {
    json: z.infer<T>;
  };
};

type RawHandlerContext<T extends z.ZodType = z.ZodUndefined, Env extends ApiEnv = ApiEnv> = Context<
  Env,
  string,
  JsonInputSchema<T>
>;

export type DefineRawHandler<T extends z.ZodType = z.ZodUndefined, Env extends ApiEnv = ApiEnv> = (
  context: RawHandlerContext<T, Env>,
) => Promise<Option<Response>>;
