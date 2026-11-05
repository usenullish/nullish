import { describe, expect, test } from "bun:test";
import { formatIban } from "../../src/format/iban";

describe("formatIban", () => {
  test("groups the IBAN by four characters", () => {
    expect(formatIban("CH9300762011623852957")).toBe("CH93 0076 2011 6238 5295 7");
  });

  test("regroups an IBAN that already has spaces", () => {
    expect(formatIban("CH93 00762 011623 852957")).toBe("CH93 0076 2011 6238 5295 7");
  });

  test("groups an IBAN with letters in its account number", () => {
    expect(formatIban("FR1420041010050500013M02606")).toBe("FR14 2004 1010 0505 0001 3M02 606");
  });

  test("keeps an IBAN of a multiple of four characters without a trailing space", () => {
    expect(formatIban("ES9121000418450200051332")).toBe("ES91 2100 0418 4502 0005 1332");
  });
});
