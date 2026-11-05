import * as z from "zod";
import {
  QUERY_DEFAULT_PAGINATION,
  QueryPaginationSchema,
  QuerySortDirectionSchema,
} from "../../db/_query";
import { NotEmptyStringSchema } from "@usenullish/nullish-common";

export const ListQueryParamsSchema = z.strictObject({
  limit: z.coerce.number(),
  offset: z.coerce.number(),
  sort: NotEmptyStringSchema,
  direction: QuerySortDirectionSchema,
});

const ListQueryArgsSchema = z.strictObject({
  pagination: QueryPaginationSchema,
  sort: z.strictObject({
    field: NotEmptyStringSchema,
    direction: QuerySortDirectionSchema,
  }),
});

export const ListQuerySchema = z.codec(ListQueryParamsSchema, ListQueryArgsSchema, {
  decode: ({ limit, offset, sort, direction }) => ({
    pagination: { limit, offset },
    sort: { field: sort, direction },
  }),
  encode: ({ pagination: { limit, offset }, sort: { field, direction } }) => ({
    limit: limit ?? QUERY_DEFAULT_PAGINATION,
    offset: offset ?? 0,
    sort: field,
    direction,
  }),
});
