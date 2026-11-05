import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { CommonSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";

const ServerErrorSchema = z.object({
  reason: CommonSchema.Error.ErrorSchema.shape.error,
});

const UserFacingErrorSchema = ServerErrorSchema.extend({
  code: CommonSchema.Error.ErrorCodeSchema.exclude(["UNEXPECTED"]),
});

export const errorReason = (err: unknown): Option<string> =>
  UserFacingErrorSchema.safeParse(err).data?.reason;

const ApiErrorInfoSchema = z.object({
  status: z.number(),
  code: CommonSchema.Error.ErrorCodeSchema.optional(),
});

export const errorApiInfo = (err: unknown): Option<z.infer<typeof ApiErrorInfoSchema>> =>
  ApiErrorInfoSchema.safeParse(err).data;

const causeToString = (cause: unknown): Option<string> => {
  if (isNullish(cause) || cause instanceof Response) {
    return undefined;
  }

  return cause instanceof Error ? cause.message : JSON.stringify(cause);
};

export const errorDetailToString = (err: unknown): Option<string> => {
  if (typeof err === "string") {
    return err;
  }

  if (!(err instanceof Error)) {
    return undefined;
  }

  const detail = ServerErrorSchema.safeParse(err).data?.reason ?? causeToString(err.cause);

  return nonNullish(detail) ? `${err.message}: ${detail}` : err.message;
};
