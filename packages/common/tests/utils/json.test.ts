import { describe, expect, test } from "bun:test";
import { jsonSortedReplacer } from "../../src/utils/json";

const stringify = (value: unknown): string => JSON.stringify(value, jsonSortedReplacer);

describe("jsonSortedReplacer", () => {
  test("gives the same text whatever the order of the keys", () => {
    expect(stringify({ b: 1, a: 2 })).toBe(stringify({ a: 2, b: 1 }));
  });

  test("sorts the keys", () => {
    expect(stringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test("sorts the keys of nested objects", () => {
    expect(stringify({ b: { d: 1, c: 2 }, a: null })).toBe('{"a":null,"b":{"c":2,"d":1}}');
  });

  test("keeps the order of an array and sorts the objects in it", () => {
    expect(stringify([{ b: 1, a: 2 }, 3])).toBe('[{"a":2,"b":1},3]');
  });

  test("sorts the keys by code point, independently of the locale", () => {
    expect(stringify({ b: 1, B: 2, a: 3 })).toBe('{"B":2,"a":3,"b":1}');
  });

  test("leaves a value that is not an object as JSON.stringify writes it", () => {
    expect(stringify("text")).toBe(JSON.stringify("text"));
  });
});
