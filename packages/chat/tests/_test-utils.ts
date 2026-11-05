import { type Mock, spyOn } from "bun:test";
// eslint-disable-next-line import/extensions
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/extensions
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
// eslint-disable-next-line import/extensions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

export interface LlmRequestBody {
  model: string;
  stream: boolean;
  stream_options?: { include_usage: boolean };
  max_tokens?: number;
  messages: {
    role: string;
    content?: string | null;
    tool_call_id?: string;
    tool_calls?: unknown;
  }[];
  tools: { type: string; function: { name: string; description?: string; parameters?: unknown } }[];
}

const chunk = (delta: Record<string, unknown>) => ({
  id: "chatcmpl-test",
  object: "chat.completion.chunk",
  created: 0,
  model: "test",
  choices: [{ index: 0, delta, finish_reason: null }],
});

const usageChunk = ({
  promptTokens,
  completionTokens,
}: {
  promptTokens: number;
  completionTokens: number;
}) => ({
  id: "chatcmpl-test",
  object: "chat.completion.chunk",
  created: 0,
  model: "test",
  choices: [],
  usage: {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  },
});

const sse = (chunks: (ReturnType<typeof chunk> | ReturnType<typeof usageChunk>)[]): Response =>
  new Response(
    [...chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`), "data: [DONE]\n\n"].join(""),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );

export const textAnswer = (...parts: string[]): Response =>
  sse(parts.map((content) => chunk({ content })));

export const textAnswerWithUsage = ({
  text,
  promptTokens,
  completionTokens,
}: {
  text: string;
  promptTokens: number;
  completionTokens: number;
}): Response => sse([chunk({ content: text }), usageChunk({ promptTokens, completionTokens })]);

export const toolCallAnswer = ({
  id,
  name,
  args,
}: {
  id: string;
  name: string;
  args: string;
}): Response =>
  sse([
    chunk({
      tool_calls: [{ index: 0, id, type: "function", function: { name, arguments: "" } }],
    }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(0, 5) } }] }),
    chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(5) } }] }),
  ]);

export const toolCallWithoutNameAnswer = ({ id }: { id: string }): Response =>
  sse([chunk({ tool_calls: [{ index: 0, id, type: "function", function: { arguments: "{}" } }] })]);

export const mockLlm = (responses: Response[]): Mock<typeof fetch> => {
  const next = async (): Promise<Response> => {
    const response = responses.shift();

    if (response === undefined) {
      throw new Error("No more LLM responses.");
    }

    return response;
  };

  return spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(next, { preconnect: fetch.preconnect }),
  );
};

export const llmRequestBody = ({
  fetchSpy,
  call,
}: {
  fetchSpy: Mock<typeof fetch>;
  call: number;
}): LlmRequestBody => JSON.parse(String(fetchSpy.mock.calls[call]?.[1]?.body)) as LlmRequestBody;

export const TEST_TOOLS = [
  "echo",
  "count_clients",
  "fail",
  "multi",
  "empty",
  "count_invoices",
  "list_organizations",
  "create_organization",
];

export const CREATED_ORGANIZATION_ID = "33333333-3333-4333-8333-333333333333";

export const connectMcp = async (): Promise<Client> => {
  const server = new McpServer({ name: "test", version: "0.0.0" });

  server.registerTool(
    "echo",
    {
      description: "Echoes a text.",
      inputSchema: { text: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ text }) => ({ content: [{ type: "text", text: `echo: ${text}` }] }),
  );

  server.registerTool("count_clients", { description: "Counts the clients." }, async () => ({
    content: [],
    structuredContent: { count: 3 },
  }));

  server.registerTool("fail", { description: "Always fails." }, async () => ({
    isError: true,
    content: [{ type: "text", text: "Something failed." }],
  }));

  server.registerTool("multi", { description: "Returns several parts." }, async () => ({
    content: [
      { type: "text", text: "first" },
      { type: "image", data: "aGVsbG8=", mimeType: "image/png" },
      { type: "text", text: "second" },
    ],
  }));

  server.registerTool("empty", { description: "Returns nothing." }, async () => ({
    content: [],
  }));

  server.registerTool(
    "count_invoices",
    {
      description: "Counts the invoices.",
      inputSchema: { organizationId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ organizationId }) => ({
      content: [{ type: "text", text: `invoices of ${organizationId}` }],
    }),
  );

  server.registerTool(
    "list_organizations",
    { description: "Lists the organizations.", annotations: { readOnlyHint: true } },
    async () => ({ content: [{ type: "text", text: "[]" }] }),
  );

  server.registerTool(
    "create_organization",
    {
      description: "Creates an organization.",
      inputSchema: { values: z.object({ name: z.string() }) },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ values: { name } }) =>
      name === ""
        ? { isError: true, content: [{ type: "text", text: "The name is required." }] }
        : {
            content: [{ type: "text", text: `created ${name}` }],
            structuredContent: { result: { organization: { id: CREATED_ORGANIZATION_ID, name } } },
          },
  );

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);

  return client;
};
