import * as z from "zod";
import { type Common, CommonSchema } from "@usenullish/nullish-schema/server";
import { nonNullish, type Option } from "@usenullish/nullish-common";

class ApiError extends Error {
  readonly status: Response["status"];
  readonly code: Option<Common["Error"]["code"]>;
  readonly reason: Option<Common["Error"]["error"]>;

  constructor({
    message,
    response,
    error,
  }: {
    message: string;
    response: Response;
    error: Option<Common["Error"]>;
  }) {
    super(`${message} (${response.status})`, { cause: response });

    this.status = response.status;
    this.code = error?.code;
    this.reason = error?.error;
  }
}

export interface ApiListArgs<TFilters = never> {
  query: Common["ListQuery"];
  filters?: TFilters;
}

export abstract class Api {
  protected readonly apiUrl: string;

  protected constructor({ apiUrl }: { apiUrl: string }) {
    this.apiUrl = apiUrl;
  }

  protected listSearchParams<TFilters>({
    query,
    filters,
  }: {
    query: Common["ListQuery"];
    filters?: { values: Option<TFilters>; schema: z.ZodType<TFilters, Record<string, unknown>> };
  }): URLSearchParams {
    const params = z.encode(CommonSchema.Query.ListQuerySchema, query);

    const filtersParams = nonNullish(filters?.values)
      ? Object.entries(z.encode(filters.schema, filters.values))
      : [];

    return new URLSearchParams([
      ...Object.entries(params).map(([key, value]) => [key, String(value)]),
      ...filtersParams
        .filter(([, value]) => nonNullish(value))
        .map(([key, value]) => [key, String(value)]),
    ]);
  }

  protected async throwError({
    message,
    response,
  }: {
    response: Response;
    message: string;
  }): Promise<never> {
    const body: unknown = await response.json().catch(() => undefined);

    const { data: error } = CommonSchema.Error.ErrorSchema.safeParse(body);

    throw new ApiError({ message, response, error });
  }
}
