import { describe, expect, mock, test } from "bun:test";
import type { Result } from "@usenullish/nullish-common";
import type { DbListResult } from "@usenullish/nullish-engine";
import { QUERY_MAX_PAGINATION, type QueryArgs } from "@usenullish/nullish-schema/db";
import { listAll, listChildren } from "../../../../../src/jobs/workers/exports/_helpers/list";

interface Row {
  id: number;
}

const rowsOf = ({ from, count }: { from: number; count: number }): Row[] =>
  Array.from({ length: count }, (_, index) => ({ id: from + index }));

const pagesOf = (rows: Row[]) =>
  mock(
    async ({
      pagination: { limit, offset },
    }: QueryArgs<"createdAt">): Promise<Result<DbListResult<Row>>> => ({
      status: "success",
      result: { data: rows.slice(offset, offset + limit) },
    }),
  );

describe("listAll", () => {
  test("returns the rows of a single page", async () => {
    const list = pagesOf(rowsOf({ from: 0, count: 3 }));

    expect(await listAll({ list })).toEqual(rowsOf({ from: 0, count: 3 }));
    expect(list).toHaveBeenCalledTimes(1);
  });

  test("returns no rows when the first page is empty", async () => {
    const list = pagesOf([]);

    expect(await listAll({ list })).toEqual([]);
    expect(list).toHaveBeenCalledTimes(1);
  });

  test("lists the pages sorted by creation date with the maximum limit", async () => {
    const list = pagesOf(rowsOf({ from: 0, count: 1 }));

    await listAll({ list });

    expect(list).toHaveBeenCalledWith({
      pagination: { limit: QUERY_MAX_PAGINATION, offset: 0 },
      sort: { field: "createdAt", direction: "asc" },
    });
  });

  test("follows the pages until one is not full", async () => {
    const rows = rowsOf({ from: 0, count: 2 * QUERY_MAX_PAGINATION + 1 });
    const list = pagesOf(rows);

    expect(await listAll({ list })).toEqual(rows);
    expect(list).toHaveBeenCalledTimes(3);
    expect(list.mock.calls.map(([{ pagination }]) => pagination.offset)).toEqual([
      0,
      QUERY_MAX_PAGINATION,
      2 * QUERY_MAX_PAGINATION,
    ]);
  });

  test("lists one more empty page when the rows fill the last page exactly", async () => {
    const rows = rowsOf({ from: 0, count: QUERY_MAX_PAGINATION });
    const list = pagesOf(rows);

    expect(await listAll({ list })).toEqual(rows);
    expect(list).toHaveBeenCalledTimes(2);
  });

  test("throws the error of a page", async () => {
    const err = new Error("list failed");

    await expect(listAll({ list: async () => ({ status: "error", err }) })).rejects.toBe(err);
  });
});

describe("listChildren", () => {
  test("returns no rows without parents", async () => {
    const list = mock(() => pagesOf([]));

    expect(await listChildren({ parents: [], list })).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  test("returns the rows of every parent in the order of the parents", async () => {
    const children: Record<string, Row[]> = {
      a: rowsOf({ from: 0, count: 2 }),
      b: [],
      c: rowsOf({ from: 10, count: 1 }),
    };

    const rows = await listChildren({
      parents: ["a", "b", "c"],
      list: (parent) => pagesOf(children[parent] ?? []),
    });

    expect(rows).toEqual([...rowsOf({ from: 0, count: 2 }), ...rowsOf({ from: 10, count: 1 })]);
  });

  test("lists every page of a parent", async () => {
    const rows = rowsOf({ from: 0, count: QUERY_MAX_PAGINATION + 1 });

    expect(await listChildren({ parents: ["a"], list: () => pagesOf(rows) })).toEqual(rows);
  });

  test("throws the error of a parent", async () => {
    const err = new Error("list failed");

    await expect(
      listChildren({
        parents: ["a", "b"],
        list: (parent) => (parent === "a" ? pagesOf([]) : async () => ({ status: "error", err })),
      }),
    ).rejects.toBe(err);
  });
});
