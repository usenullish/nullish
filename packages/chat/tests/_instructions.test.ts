import { describe, expect, test } from "bun:test";
import type { Api } from "@usenullish/nullish-schema/server";
import { instructions } from "../src/_instructions";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];

const ORGANIZATION_DOMAIN: ChatDomain = {
  type: "organization",
  organizationId: ORGANIZATION_ID,
  readOnly: false,
};
const UNSCOPED_DOMAIN: ChatDomain = { type: "unscoped" };

describe("instructions", () => {
  describe("organization domain", () => {
    test("tells the model the organization the tools work on", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        `The organization of the user has the ID ${ORGANIZATION_ID}. The tools that take an organizationId always work on it, without you passing it.`,
      );
    });

    test("tells the model it only sees this organization", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        "You only see this organization.",
      );
    });

    test("differs only by the organization", () => {
      const other = "22222222-2222-4222-8222-222222222222";

      expect(
        instructions({ domain: { type: "organization", organizationId: other, readOnly: false } }),
      ).toBe(instructions({ domain: ORGANIZATION_DOMAIN }).replace(ORGANIZATION_ID, other));
    });
  });

  describe("amounts", () => {
    test("explains the wire format of the amounts in the organization domain", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain('{ "__bigint__": "12345" }');
    });

    test("shifts the amounts by the decimals of their currency", () => {
      const text = instructions({ domain: ORGANIZATION_DOMAIN });

      expect(text).toContain(
        "move the decimal point left by the number of decimals of its currency",
      );
      expect(text).not.toContain("Divide by 100");
    });

    test("explains how to pad the small amounts", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain("5 is 0.05");
    });

    test("explains how to pass an amount to a tool", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        '100 is { "__bigint__": "10000" }',
      );
    });

    test("gives the decimals of the seeded currencies to avoid a lookup", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        "CHF, EUR and USD have 2 decimals",
      );
    });

    test("tells the model to look up the decimals of any other currency", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        "For any other currency, look up its decimals with list_currencies.",
      );
    });

    test("tells the model the currency of the amounts without one", () => {
      expect(instructions({ domain: ORGANIZATION_DOMAIN })).toContain(
        "in the baseCurrency of the accounting settings",
      );
    });

    test("explains the wire format of the amounts in the unscoped domain", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain('{ "__bigint__": "12345" }');
    });
  });

  describe("unscoped domain", () => {
    test("tells the model that no organization is selected", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "The user has not selected an organization",
      );
    });

    test("mentions no organization ID", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).not.toContain("has the ID");
    });

    test("tells the model it can only read", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain("you can only read data");
    });

    test("tells the model to search an organization named by the user", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "find it with list_organizations and filters.search set to that name",
      );
    });

    test("tells the model to list all organizations page by page", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "list them without a filter, page by page if needed",
      );
    });

    test("forbids guessing an organization ID", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain("Never guess an ID.");
    });

    test("tells the model to call the relevant tool for each organization at once", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "call the relevant tool for each organization at once, then answer per organization",
      );
    });

    test("tells the model to refer to organizations by their name", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "Refer to organizations by their name, never by their ID.",
      );
    });

    test("tells the model to send changes to the organization", () => {
      expect(instructions({ domain: UNSCOPED_DOMAIN })).toContain(
        "do not attempt it: tell them to open the organization in question and ask there",
      );
    });
  });

  describe.each([
    ["organization", ORGANIZATION_DOMAIN],
    ["unscoped", UNSCOPED_DOMAIN],
  ])("%s domain", (_, domain) => {
    test("explains the wire format of the dates", () => {
      expect(instructions({ domain })).toContain('{ "__date__": "YYYY-MM-DD" }');
    });

    test("forbids inventing figures", () => {
      expect(instructions({ domain })).toContain("Never invent figures");
    });

    test("forbids answering from general knowledge about taxes, VAT rates or law", () => {
      expect(instructions({ domain })).toContain(
        "Do not answer from general knowledge about taxes, VAT rates or law",
      );
    });

    test("restricts the assistant to the application and the accounting", () => {
      expect(instructions({ domain })).toContain(
        "Only help with this application and the accounting of the organization.",
      );
    });

    test("tells to read a record and pass its version before updating it", () => {
      expect(instructions({ domain })).toContain(
        "Before updating a record, read it with its get tool and pass its version unchanged.",
      );
    });

    test("restricts the actions that cannot be undone to an explicit request of the user", () => {
      expect(instructions({ domain })).toContain("Only perform an action that cannot be undone");
    });

    test("puts one instruction per line", () => {
      const lines = instructions({ domain }).split("\n");

      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every((line) => line.trim() !== "")).toBeTrue();
    });
  });
});
