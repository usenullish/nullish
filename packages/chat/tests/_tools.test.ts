import { afterEach, beforeEach, describe, expect, test } from "bun:test";
// eslint-disable-next-line import/extensions
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { callTool, listTools } from "../src/_tools";
import { connectMcp, CREATED_ORGANIZATION_ID, TEST_TOOLS } from "./_test-utils";

describe("tools", () => {
  let mcp: Client;

  beforeEach(async () => {
    mcp = await connectMcp();
  });

  afterEach(async () => {
    await mcp.close();
  });

  describe("listTools", () => {
    test("maps every MCP tool to a function of the model", async () => {
      const result = await listTools({ mcp });

      expect(result.status).toBe("success");

      const tools = result.status === "success" ? result.result : [];

      expect(tools.every(({ definition: { type } }) => type === "function")).toBeTrue();
      expect(tools.map(({ name }) => name).toSorted()).toEqual(TEST_TOOLS.toSorted());
    });

    test("passes the description and the input schema of the tool", async () => {
      const result = await listTools({ mcp });

      const echo =
        result.status === "success" ? result.result.find(({ name }) => name === "echo") : undefined;

      expect(echo?.definition.function.description).toBe("Echoes a text.");
      expect(echo?.definition.function.parameters).toMatchObject({
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      });
    });

    test("keeps the annotations of the tool", async () => {
      const result = await listTools({ mcp });

      const annotations = ({ tool }: { tool: string }) =>
        result.status === "success"
          ? result.result.find(({ name }) => name === tool)?.annotations
          : undefined;

      expect(annotations({ tool: "echo" })).toEqual({ readOnlyHint: true });
      expect(annotations({ tool: "create_organization" })).toEqual({
        readOnlyHint: false,
        destructiveHint: false,
      });
    });

    test("tells whether the tool takes an organizationId", async () => {
      const result = await listTools({ mcp });

      const takesOrganizationId = ({ tool }: { tool: string }) =>
        result.status === "success"
          ? result.result.find(({ name }) => name === tool)?.takesOrganizationId
          : undefined;

      expect(takesOrganizationId({ tool: "count_invoices" })).toBeTrue();
      expect(takesOrganizationId({ tool: "echo" })).toBeFalse();
    });

    test("leaves the annotations empty when the tool has none", async () => {
      const result = await listTools({ mcp });

      const fail =
        result.status === "success" ? result.result.find(({ name }) => name === "fail") : undefined;

      expect(fail).toBeDefined();
      expect(fail?.annotations).toBeUndefined();
    });

    test("does not send the annotations to the model", async () => {
      const result = await listTools({ mcp });

      const echo =
        result.status === "success" ? result.result.find(({ name }) => name === "echo") : undefined;

      expect(JSON.stringify(echo?.definition)).not.toContain("readOnlyHint");
    });

    test("returns an error when the MCP client is closed", async () => {
      await mcp.close();

      const result = await listTools({ mcp });

      expect(result.status).toBe("error");
    });
  });

  describe("callTool", () => {
    test("returns the text of the tool", async () => {
      expect(
        await callTool({ mcp, name: "echo", args: JSON.stringify({ text: "hello" }) }),
      ).toEqual({ content: "echo: hello", isError: false });
    });

    test("joins the text parts and ignores the other parts", async () => {
      expect(await callTool({ mcp, name: "multi", args: "{}" })).toEqual({
        content: "first\nsecond",
        isError: false,
      });
    });

    test("falls back to the structured content when there is no text", async () => {
      expect(await callTool({ mcp, name: "count_clients", args: "{}" })).toEqual({
        content: JSON.stringify({ count: 3 }),
        structuredContent: { count: 3 },
        isError: false,
      });
    });

    test("returns an empty object when there is neither text nor structured content", async () => {
      expect(await callTool({ mcp, name: "empty", args: "{}" })).toEqual({
        content: "{}",
        isError: false,
      });
    });

    test("treats empty arguments as no arguments", async () => {
      expect(await callTool({ mcp, name: "count_clients", args: "" })).toEqual({
        content: JSON.stringify({ count: 3 }),
        structuredContent: { count: 3 },
        isError: false,
      });
    });

    test("returns the structured content of the tool", async () => {
      const { structuredContent } = await callTool({
        mcp,
        name: "create_organization",
        args: JSON.stringify({ values: { name: "Demo" } }),
      });

      expect(structuredContent).toEqual({
        result: { organization: { id: CREATED_ORGANIZATION_ID, name: "Demo" } },
      });
    });

    test("passes the injected arguments to the tool", async () => {
      expect(
        await callTool({
          mcp,
          name: "count_invoices",
          args: "{}",
          injectedArgs: { organizationId: "injected" },
        }),
      ).toEqual({ content: "invoices of injected", isError: false });
    });

    test("prefers the injected arguments over those of the model", async () => {
      const { content } = await callTool({
        mcp,
        name: "count_invoices",
        args: JSON.stringify({ organizationId: "model" }),
        injectedArgs: { organizationId: "injected" },
      });

      expect(content).toBe("invoices of injected");
    });

    test("returns the error of a failing tool", async () => {
      expect(await callTool({ mcp, name: "fail", args: "{}" })).toEqual({
        content: "Something failed.",
        isError: true,
      });
    });

    test("returns an error for an unknown tool", async () => {
      const { isError } = await callTool({ mcp, name: "unknown", args: "{}" });

      expect(isError).toBeTrue();
    });

    test("returns an error when the arguments do not match the input schema", async () => {
      const { isError } = await callTool({
        mcp,
        name: "echo",
        args: JSON.stringify({ text: 42 }),
      });

      expect(isError).toBeTrue();
    });

    test.each(["{ not json", "[1, 2]", "42", '"text"', "null"])(
      "rejects %p as arguments without calling the tool",
      async (args) => {
        expect(await callTool({ mcp, name: "echo", args })).toEqual({
          content: "The arguments are not valid JSON.",
          isError: true,
        });
      },
    );

    test("returns an error when the MCP client is closed", async () => {
      await mcp.close();

      const { isError } = await callTool({
        mcp,
        name: "echo",
        args: JSON.stringify({ text: "hello" }),
      });

      expect(isError).toBeTrue();
    });
  });
});
