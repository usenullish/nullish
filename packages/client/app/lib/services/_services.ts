import type { Common } from "@usenullish/nullish-schema/server";
import { QUERY_MAX_PAGINATION } from "@usenullish/nullish-schema/db";

export abstract class Service {
  readonly #listFirstPageQuery: Common["ListQuery"] = {
    pagination: { limit: QUERY_MAX_PAGINATION, offset: 0 },
    sort: { field: "createdAt", direction: "asc" },
  };

  protected get _listFirstPageQuery(): Common["ListQuery"] {
    return this.#listFirstPageQuery;
  }

  protected _listAll = async <T>({
    listFn,
    query = this.#listFirstPageQuery,
  }: {
    listFn: (query: Common["ListQuery"]) => Promise<T[]>;
    query?: Common["ListQuery"];
  }): Promise<T[]> => {
    const items = await listFn(query);

    const {
      pagination: { limit, offset },
    } = query;

    if (items.length < limit) {
      return items;
    }

    const next = await this._listAll({
      listFn,
      query: { ...query, pagination: { limit, offset: offset + limit } },
    });

    return [...items, ...next];
  };
}
