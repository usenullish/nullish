import { afterEach, beforeEach, describe, expect, type Mock, spyOn, test } from "bun:test";
// eslint-disable-next-line import/extensions
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  connectMcp,
  llmRequestBody,
  mockLlm,
  TEST_TOOLS,
  textAnswer,
  textAnswerWithUsage,
  toolCallAnswer,
  toolCallWithoutNameAnswer,
} from "./_test-utils";
import { MAX_OUTPUT_TOKENS } from "../src/_constants";
import type { Api } from "@usenullish/nullish-schema/server";
import { Chat, type ChatStreamEvent } from "../src";
import { MessageRole } from "@usenullish/nullish-schema/db";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

type ChatEvent = Api["Chat"]["Client"]["ChatEvent"];
type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];

const ORGANIZATION_DOMAIN: ChatDomain = { type: "organization", organizationId: ORGANIZATION_ID };

const MESSAGE = "How many clients do I have?";

describe("chat", () => {
  let mcp: Client;
  let fetchSpy: Mock<typeof fetch>;

  const requestBody = (call: number) => llmRequestBody({ fetchSpy, call });

  const streamAll = async ({
    domain = ORGANIZATION_DOMAIN,
    history = [],
  }: Partial<Pick<Parameters<Chat["stream"]>[0], "domain" | "history">> = {}): Promise<
    ChatStreamEvent[]
  > => await Array.fromAsync(Chat.create({ mcp }).stream({ domain, history, message: MESSAGE }));

  const stream = async (
    args: Partial<Pick<Parameters<Chat["stream"]>[0], "domain" | "history">> = {},
  ): Promise<ChatEvent[]> =>
    (await streamAll(args)).flatMap((event) => (event.type === "message" ? [] : [event]));

  const storedMessages = (events: ChatStreamEvent[]) =>
    events.flatMap((event) => (event.type === "message" ? [event.message] : []));

  const toolNames = (call: number): string[] =>
    requestBody(call)
      .tools.map(({ function: { name } }) => name)
      .toSorted();

  const toolParameters = ({ call, name }: { call: number; name: string }): unknown =>
    requestBody(call).tools.find(({ function: { name: n } }) => n === name)?.function.parameters;

  beforeEach(async () => {
    mcp = await connectMcp();
  });

  afterEach(async () => {
    fetchSpy.mockRestore();
    await mcp.close();
  });

  describe("abort", () => {
    test("stops without an error event when the signal is aborted", async () => {
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const controller = new AbortController();
      controller.abort();

      const events = await Array.fromAsync(
        Chat.create({ mcp }).stream({
          domain: ORGANIZATION_DOMAIN,
          history: [],
          message: MESSAGE,
          signal: controller.signal,
        }),
      );

      expect(events).toEqual([]);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("history", () => {
    test("sends the history before the new message", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream({
        history: [
          { role: MessageRole.USER, content: "Hi" },
          { role: MessageRole.ASSISTANT, content: "Hello, how can I help?" },
        ],
      });

      expect(requestBody(0).messages.slice(1)).toEqual([
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello, how can I help?" },
        { role: "user", content: MESSAGE },
      ]);
    });

    test("replays the tool calls and their results", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const toolCalls = [
        {
          id: "call_1",
          type: "function" as const,
          function: { name: "count_clients", arguments: "{}" },
        },
      ];

      await stream({
        history: [
          { role: MessageRole.USER, content: "Count" },
          { role: MessageRole.ASSISTANT, content: null, toolCalls },
          { role: MessageRole.TOOL, content: '{"count":3}', toolCallId: "call_1" },
          { role: MessageRole.ASSISTANT, content: "Three." },
        ],
      });

      expect(requestBody(0).messages.slice(1, 5)).toEqual([
        { role: "user", content: "Count" },
        { role: "assistant", content: null, tool_calls: toolCalls },
        { role: "tool", tool_call_id: "call_1", content: '{"count":3}' },
        { role: "assistant", content: "Three." },
      ]);
    });

    test("starts the history at its first user message", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream({
        history: [
          { role: MessageRole.TOOL, content: "orphan", toolCallId: "call_0" },
          { role: MessageRole.USER, content: "Hi" },
        ],
      });

      expect(requestBody(0).messages.slice(1)).toEqual([
        { role: "user", content: "Hi" },
        { role: "user", content: MESSAGE },
      ]);
    });

    test("truncates the long tool results of the history", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream({
        history: [
          { role: MessageRole.USER, content: "List" },
          {
            role: MessageRole.ASSISTANT,
            content: null,
            toolCalls: [
              {
                id: "call_1",
                type: "function" as const,
                function: { name: "count_clients", arguments: "{}" },
              },
            ],
          },
          { role: MessageRole.TOOL, content: "x".repeat(10_000), toolCallId: "call_1" },
        ],
      });

      const tool = requestBody(0).messages.find(({ role }) => role === "tool");

      expect(tool?.content?.length).toBeLessThan(10_000);
      expect(tool?.content?.endsWith("…")).toBeTrue();
    });
  });

  describe("messages", () => {
    test("emits the final answer as an assistant message", async () => {
      fetchSpy = mockLlm([textAnswer("You have ", "three clients.")]);

      const events = await streamAll();

      expect(storedMessages(events)).toEqual([
        { role: MessageRole.ASSISTANT, content: "You have three clients." },
      ]);
    });

    test("emits the tool calls and their results as messages", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "count_clients", args: "" }),
        textAnswer("Three."),
      ]);

      const events = await streamAll();

      expect(storedMessages(events)).toEqual([
        {
          role: MessageRole.ASSISTANT,
          content: null,
          toolCalls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "count_clients", arguments: "" },
            },
          ],
        },
        { role: MessageRole.TOOL, content: expect.any(String), toolCallId: "call_1" },
        { role: MessageRole.ASSISTANT, content: "Three." },
      ]);
    });
  });

  describe("usage", () => {
    test("requests the token usage with the stream", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream();

      expect(requestBody(0).stream_options).toEqual({ include_usage: true });
    });

    test("caps the tokens the model can generate per call", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream();

      expect(requestBody(0).max_tokens).toBe(MAX_OUTPUT_TOKENS);
    });

    test("streams the tokens of a model call as a usage event", async () => {
      fetchSpy = mockLlm([
        textAnswerWithUsage({ text: "Hello.", promptTokens: 120, completionTokens: 8 }),
      ]);

      const events = await stream();

      expect(events).toEqual([
        { type: "text", delta: "Hello." },
        { type: "usage", model: expect.any(String), inputTokens: 120n, outputTokens: 8n },
        { type: "done" },
      ]);
    });

    test("does not stream a usage event when the stream has no usage", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      const events = await stream();

      expect(events.some(({ type }) => type === "usage")).toBeFalse();
    });
  });

  describe("answers", () => {
    test("streams the text of the answer and ends with done", async () => {
      fetchSpy = mockLlm([textAnswer("You have ", "three clients.")]);

      const events = await stream();

      expect(events).toEqual([
        { type: "text", delta: "You have " },
        { type: "text", delta: "three clients." },
        { type: "done" },
      ]);
    });

    test("sends the instructions with the organization and the conversation to the model", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream();

      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const { stream: streamed, messages } = requestBody(0);

      expect(streamed).toBeTrue();
      expect(messages[0]?.role).toBe("system");
      expect(messages[0]?.content).toContain(ORGANIZATION_ID);
      expect(messages.slice(1)).toEqual([{ role: "user", content: MESSAGE }]);
    });

    test("exposes the MCP tools as functions to the model", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream();

      const { tools } = requestBody(0);

      expect(tools.every(({ type }) => type === "function")).toBeTrue();
      expect(tools.map(({ function: { name } }) => name).toSorted()).toEqual(
        TEST_TOOLS.filter((name) => name !== "create_organization").toSorted(),
      );
    });
  });

  describe("domains", () => {
    test("passes on the tools of the server, but create_organization, in the unscoped domain", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream({ domain: { type: "unscoped" } });

      expect(toolNames(0)).toEqual(
        TEST_TOOLS.filter((name) => name !== "create_organization").toSorted(),
      );
    });

    test("tells the model that no organization is selected in the unscoped domain", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream({ domain: { type: "unscoped" } });

      const { messages } = requestBody(0);

      expect(messages[0]?.content).toContain("The user has not selected an organization");
      expect(messages[0]?.content).not.toContain(ORGANIZATION_ID);
    });

    test("hides the organizationId argument from the model in the organization domain", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await stream();

      expect(toolParameters({ call: 0, name: "count_invoices" })).toMatchObject({
        type: "object",
        properties: {},
      });
      expect(JSON.stringify(toolParameters({ call: 0, name: "count_invoices" }))).not.toContain(
        "organizationId",
      );
    });

    test("calls the tools with the organization of the domain", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "count_invoices", args: "{}" }),
        textAnswer("Done."),
      ]);

      await stream();

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe(`invoices of ${ORGANIZATION_ID}`);
    });

    test("ignores an organization passed by the model in the organization domain", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({
          id: "call_1",
          name: "count_invoices",
          args: JSON.stringify({ organizationId: "22222222-2222-4222-8222-222222222222" }),
        }),
        textAnswer("Done."),
      ]);

      await stream();

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe(`invoices of ${ORGANIZATION_ID}`);
    });

    test("refuses a tool outside of the domain without calling it", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({
          id: "call_1",
          name: "create_organization",
          args: JSON.stringify({ values: { name: "Demo" } }),
        }),
        textAnswer("Sorry."),
      ]);

      const events = await stream();

      expect(events).toContainEqual(
        expect.objectContaining({
          type: "tool_error",
          name: "create_organization",
        }),
      );

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe("The tool is not available.");
    });

    describe("unscoped", () => {
      test("keeps the organizationId argument for the model", async () => {
        fetchSpy = mockLlm([textAnswer("Hello.")]);

        await stream({ domain: { type: "unscoped" } });

        expect(JSON.stringify(toolParameters({ call: 0, name: "count_invoices" }))).toContain(
          "organizationId",
        );
      });

      test("calls the tools with the organization passed by the model", async () => {
        fetchSpy = mockLlm([
          toolCallAnswer({
            id: "call_1",
            name: "count_invoices",
            args: JSON.stringify({ organizationId: ORGANIZATION_ID }),
          }),
          textAnswer("Done."),
        ]);

        await stream({ domain: { type: "unscoped" } });

        const { messages } = requestBody(1);

        expect(messages.at(-1)?.content).toBe(`invoices of ${ORGANIZATION_ID}`);
      });

      test.each(["create_organization"])("refuses %s without calling it", async (name) => {
        fetchSpy = mockLlm([
          toolCallAnswer({
            id: "call_1",
            name,
            args: JSON.stringify({ values: { name: "Demo" } }),
          }),
          textAnswer("Sorry."),
        ]);

        const events = await stream({ domain: { type: "unscoped" } });

        expect(events).toContainEqual(expect.objectContaining({ type: "tool_error", name }));

        const { messages } = requestBody(1);

        expect(messages.at(-1)?.content).toBe("The tool is not available.");
      });

      test("keeps the unscoped domain after a tool call", async () => {
        fetchSpy = mockLlm([
          toolCallAnswer({ id: "call_1", name: "list_organizations", args: "{}" }),
          textAnswer("Done."),
        ]);

        await stream({ domain: { type: "unscoped" } });

        expect(toolNames(1)).toEqual(
          TEST_TOOLS.filter((name) => name !== "create_organization").toSorted(),
        );
        expect(requestBody(1).messages[0]?.content).toContain(
          "The user has not selected an organization",
        );
      });
    });
  });

  describe("tools", () => {
    test("calls the tool requested by the model and answers with its result", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "echo", args: JSON.stringify({ text: "hello" }) }),
        textAnswer("Done."),
      ]);

      const events = await stream();

      expect(events).toEqual([
        { type: "tool_call", name: "echo" },
        { type: "tool_result", name: "echo" },
        { type: "text", delta: "Done." },
        { type: "done" },
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const { messages } = requestBody(1);

      expect(messages.at(-1)).toEqual({
        role: "tool",
        tool_call_id: "call_1",
        content: "echo: hello",
      });
    });

    test("passes the concatenated fragments of the tool call to the model", async () => {
      const args = JSON.stringify({ text: "fragmented" });

      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "echo", args }),
        textAnswer("Done."),
      ]);

      await stream();

      const { messages } = requestBody(1);

      expect(messages.at(-2)).toMatchObject({
        role: "assistant",
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "echo", arguments: args } },
        ],
      });
    });

    test("returns the structured content when the tool returns no text", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "count_clients", args: "" }),
        textAnswer("3."),
      ]);

      await stream();

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe(JSON.stringify({ count: 3 }));
    });

    test("reports a failing tool as an error result to the model", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "fail", args: "" }),
        textAnswer("Sorry."),
      ]);

      const events = await stream();

      expect(events).toContainEqual({
        type: "tool_error",
        name: "fail",
        message: "Something failed.",
      });

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe("Something failed.");
    });

    test("reports an unknown tool as an error result to the model", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "unknown", args: "" }),
        textAnswer("Sorry."),
      ]);

      const events = await stream();

      expect(events).toContainEqual({
        type: "tool_error",
        name: "unknown",
        message: "The tool is not available.",
      });
      expect(events.at(-1)).toEqual({ type: "done" });
    });

    test("reports invalid JSON arguments as an error result without calling the tool", async () => {
      fetchSpy = mockLlm([
        toolCallAnswer({ id: "call_1", name: "echo", args: "{ not json" }),
        textAnswer("Sorry."),
      ]);

      const events = await stream();

      expect(events).toContainEqual({
        type: "tool_error",
        name: "echo",
        message: "The arguments are not valid JSON.",
      });

      const { messages } = requestBody(1);

      expect(messages.at(-1)?.content).toBe("The arguments are not valid JSON.");
    });

    test("stops with an error when the model keeps calling tools", async () => {
      fetchSpy = mockLlm(
        Array.from({ length: 8 }, (_, i) =>
          toolCallAnswer({ id: `call_${i}`, name: "count_clients", args: "" }),
        ),
      );

      const events = await stream();

      expect(fetchSpy).toHaveBeenCalledTimes(8);
      expect(events.at(-1)).toEqual({
        type: "error",
        message: "The assistant did not answer within the allowed steps.",
      });
    });
  });

  describe("errors", () => {
    let consoleErrorSpy: Mock<typeof console.error>;

    beforeEach(() => {
      consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    test("yields an error when the model is not available", async () => {
      fetchSpy = mockLlm([
        new Response(JSON.stringify({ error: { message: "Bad request" } }), { status: 400 }),
      ]);

      const events = await stream();

      expect(events).toEqual([{ type: "error", message: "The assistant is not available." }]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("yields an error when a tool call has no name", async () => {
      fetchSpy = mockLlm([toolCallWithoutNameAnswer({ id: "call_1" })]);

      const events = await stream();

      expect(events).toEqual([{ type: "error", message: "The assistant is not available." }]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test("yields an error when the tools are not available", async () => {
      fetchSpy = mockLlm([textAnswer("Hello.")]);

      await mcp.close();

      const events = await stream();

      expect(events).toEqual([
        { type: "error", message: "The tools of the assistant are not available." },
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
