import * as z from "zod";
import {
  QUERY_DEFAULT_PAGINATION,
  QueryCountSchema,
  QueryPaginationSchema,
  QuerySortDirectionSchema,
} from "../../db/_query";
import { isNullish, nonNullish, NotEmptyStringSchema } from "@usenullish/nullish-common";

export const ListQueryParamsSchema = z.strictObject({
  limit: z.coerce.number(),
  offset: z.coerce.number(),
  sort: NotEmptyStringSchema,
  direction: QuerySortDirectionSchema,
  count: QueryCountSchema.shape.mode.optional(),
});

const ListQueryArgsSchema = z.strictObject({
  pagination: QueryPaginationSchema,
  sort: z.strictObject({
    field: NotEmptyStringSchema,
    direction: QuerySortDirectionSchema,
  }),
  count: QueryCountSchema.optional(),
});

export const ListQuerySchema = z.codec(ListQueryParamsSchema, ListQueryArgsSchema, {
  decode: ({ limit, offset, sort, direction, count }) => ({
    pagination: { limit, offset },
    sort: { field: sort, direction },
    count: isNullish(count) ? undefined : { mode: count },
  }),
  encode: ({ pagination: { limit, offset }, sort: { field, direction }, count }) => ({
    limit: limit ?? QUERY_DEFAULT_PAGINATION,
    offset: offset ?? 0,
    sort: field,
    direction,
    ...(nonNullish(count) && { count: count.mode }),
  }),
});

export const PaginationResponseSchema = z.strictObject({
  total: z.number(),
});
