/**
 * A `JSON.stringify` replacer that sorts the keys of every object, so that the same value always gives
 * the same text whatever the order its keys were created in. Arrays keep their order.
 *
 * @example JSON.stringify({ b: 1, a: { d: 2, c: 3 } }, jsonSortedReplacer) // '{"a":{"c":3,"d":2},"b":1}'
 */
export const jsonSortedReplacer = (_key: string, value: unknown): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : value;
