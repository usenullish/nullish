import * as z from "zod";

export const QUERY_DEFAULT_PAGINATION = 100;
export const QUERY_MAX_PAGINATION = 10 * QUERY_DEFAULT_PAGINATION;

export const QueryPaginationSchema = z.strictObject({
  limit: z.int().min(1).max(QUERY_MAX_PAGINATION).optional().default(QUERY_DEFAULT_PAGINATION),
  offset: z.int().min(0).optional().default(0),
});

export type QueryPagination = z.infer<typeof QueryPaginationSchema>;

const QueryDefaultSortFieldSchema = z.enum(["createdAt", "updatedAt"]);

export type QueryDefaultSortField = z.infer<typeof QueryDefaultSortFieldSchema>;

export const QuerySortDirectionSchema = z.enum(["asc", "desc"]);

const querySortSchema = <TField extends [string, ...string[]]>(fields: TField) =>
  z.strictObject({
    field: z.enum(fields),
    direction: QuerySortDirectionSchema,
  });

export const queryArgsSchema = <TField extends [string, ...string[]]>(fields: TField) =>
  z.strictObject({
    pagination: QueryPaginationSchema,
    sort: querySortSchema(fields),
  });

export type QueryArgs<TSortField extends string = QueryDefaultSortField> = z.infer<
  ReturnType<typeof queryArgsSchema<[TSortField, ...TSortField[]]>>
>;
