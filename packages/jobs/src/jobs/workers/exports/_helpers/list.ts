import type { Result } from "@usenullish/nullish-common";
import type { DbListResult } from "@usenullish/nullish-engine";
import { QUERY_MAX_PAGINATION, type QueryArgs } from "@usenullish/nullish-schema/db";

export type ListPage<T> = (args: QueryArgs<"createdAt">) => Promise<Result<DbListResult<T>>>;

export const listAll = async <T>({
  list,
  offset = 0,
  rows = [],
}: {
  list: ListPage<T>;
  offset?: number;
  rows?: T[];
}): Promise<T[]> => {
  const result = await list({
    pagination: { limit: QUERY_MAX_PAGINATION, offset },
    sort: { field: "createdAt", direction: "asc" },
  });

  if (result.status === "error") {
    throw result.err;
  }

  const {
    result: { data: page },
  } = result;

  const all = [...rows, ...page];

  if (page.length < QUERY_MAX_PAGINATION) {
    return all;
  }

  return await listAll({
    list,
    offset: offset + QUERY_MAX_PAGINATION,
    rows: all,
  });
};

export const listChildren = async <TParent, T>({
  parents,
  list,
}: {
  parents: TParent[];
  list: (parent: TParent) => ListPage<T>;
}): Promise<T[]> => {
  const rows: T[] = [];

  for (const parent of parents) {
    rows.push(...(await listAll({ list: list(parent) })));
  }

  return rows;
};
