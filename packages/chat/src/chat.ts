// eslint-disable-next-line import/extensions
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import OpenAI from "openai";
import type {
  ChatCompletionFunctionTool,
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import {
  isArrayEmpty,
  isEmptyString,
  isNullish,
  nonNullish,
  notEmptyString,
  type Result,
} from "@usenullish/nullish-common";
import { envLlmApiKey, envLlmUrl, envLlmModel } from "@usenullish/nullish-env";
import { instructions } from "./_instructions";
import { callTool, listTools } from "./_tools";
import { domainArgs, filterTools } from "./_domain";
import type { Api } from "@usenullish/nullish-schema/server";
import { MAX_OUTPUT_TOKENS, MAX_ROUNDS } from "./_constants";
import { type ChatHistoryMessage, historyToConversation } from "./_history";
import { MessageRole } from "@usenullish/nullish-schema/db";
import { RecordsSchema } from "@usenullish/nullish-schema/records";
import * as z from "zod";

type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];
type ChatEvent = Api["Chat"]["Client"]["ChatEvent"];

export type ChatStreamEvent = ChatEvent | { type: "message"; message: ChatHistoryMessage };

interface ToolCallDraft {
  id?: string;
  name?: string;
  arguments: string;
}

interface ChatTurn {
  content: string;
  toolCalls: ChatCompletionMessageFunctionToolCall[];
}

export interface ChatStreamArgs {
  domain: ChatDomain;
  history: ChatHistoryMessage[];
  message: string;
  signal?: AbortSignal;
}

export class Chat {
  readonly #openai: OpenAI;
  readonly #model: string;
  readonly #mcp: Client;

  private constructor({ mcp }: { mcp: Client }) {
    this.#openai = new OpenAI({ baseURL: envLlmUrl(), apiKey: envLlmApiKey() });
    this.#model = envLlmModel();
    this.#mcp = mcp;
  }

  static create(args: { mcp: Client }): Chat {
    return new this(args);
  }

  // Never rejects: failures are yielded as an error event, which ends the stream
  async *stream({
    domain,
    history,
    message,
    signal,
  }: ChatStreamArgs): AsyncGenerator<ChatStreamEvent> {
    const allTools = await listTools({ mcp: this.#mcp });

    if (allTools.status === "error") {
      yield {
        type: "error",
        message: "The tools of the assistant are not available.",
      };
      return;
    }

    const tools = filterTools({ tools: allTools.result, domain });

    const conversation: ChatCompletionMessageParam[] = [
      { role: "system", content: instructions({ domain }) },
      ...historyToConversation({ history }),
      { role: "user", content: message },
    ];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const turn = yield* this.#streamTurn({
        conversation,
        tools: tools.map(({ definition }) => definition),
        signal,
      });

      if (signal?.aborted === true) {
        return;
      }

      if (turn.status === "error") {
        yield { type: "error", message: "The assistant is not available." };
        return;
      }

      const { content, toolCalls } = turn.result;

      if (isArrayEmpty(toolCalls)) {
        if (notEmptyString(content)) {
          yield {
            type: "message",
            message: { role: MessageRole.ASSISTANT, content },
          };
        }

        yield { type: "done" };
        return;
      }

      conversation.push({ role: "assistant", content, tool_calls: toolCalls });

      yield {
        type: "message",
        message: {
          role: MessageRole.ASSISTANT,
          content: isEmptyString(content) ? null : content,
          toolCalls,
        },
      };

      for (const { id, function: fn } of toolCalls) {
        yield { type: "tool_call", name: fn.name };

        // The model can only call the tools of the domain, even if it knows of others. The arguments
        // injected by the domain are read from the original tool, before its schema was restricted to the domain.
        const available = tools.some(({ name }) => name === fn.name);
        const tool = allTools.result.find(({ name }) => name === fn.name);

        const { content: result, isError } =
          !available || isNullish(tool)
            ? { content: "The tool is not available.", isError: true }
            : await callTool({
                mcp: this.#mcp,
                name: fn.name,
                args: fn.arguments,
                injectedArgs: domainArgs({ tool, domain }),
              });

        yield isError
          ? { type: "tool_error", name: fn.name, message: result }
          : { type: "tool_result", name: fn.name };

        conversation.push({ role: "tool", tool_call_id: id, content: result });

        yield {
          type: "message",
          message: { role: MessageRole.TOOL, content: result, toolCallId: id },
        };
      }
    }

    yield {
      type: "error",
      message: "The assistant did not answer within the allowed steps.",
    };
  }

  // Streams the text of one model call and collects the tool calls it requests. The tool calls
  // arrive as fragments indexed by position, which are concatenated.
  async *#streamTurn({
    conversation,
    tools,
    signal,
  }: {
    conversation: ChatCompletionMessageParam[];
    tools: ChatCompletionFunctionTool[];
    signal?: AbortSignal;
  }): AsyncGenerator<ChatEvent, Result<ChatTurn>> {
    try {
      const stream = await this.#openai.chat.completions.create(
        {
          model: this.#model,
          messages: conversation,
          tools,
          stream: true,
          stream_options: { include_usage: true },
          reasoning_effort: "none",
          max_tokens: MAX_OUTPUT_TOKENS,
        },
        { signal },
      );

      let content = "";
      const drafts = new Map<number, ToolCallDraft>();

      for await (const chunk of stream) {
        if (nonNullish(chunk.usage)) {
          yield {
            type: "usage",
            model: this.#model,
            inputTokens: BigInt(chunk.usage.prompt_tokens),
            outputTokens: BigInt(chunk.usage.completion_tokens),
          };
        }

        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          content += delta.content;
          yield { type: "text", delta: delta.content };
        }

        for (const { index, id, function: fn } of delta?.tool_calls ?? []) {
          const draft = drafts.get(index) ?? { arguments: "" };

          drafts.set(index, {
            id: nonNullish(id) ? `${draft.id ?? ""}${id}` : draft.id,
            name: nonNullish(fn?.name) ? `${draft.name ?? ""}${fn.name}` : draft.name,
            arguments: `${draft.arguments}${fn?.arguments ?? ""}`,
          });
        }
      }

      const toolCalls = z.array(RecordsSchema.Chat.MessagesSchema.ToolCallSchema).parse(
        [...drafts.entries()]
          .toSorted(([a], [b]) => a - b)
          .map(([, { id, name, arguments: args }]) => ({
            id,
            type: "function",
            function: { name, arguments: args },
          })),
      );

      return { status: "success", result: { content, toolCalls } };
    } catch (err: unknown) {
      if (signal?.aborted !== true) {
        console.error(err);
      }

      return { status: "error", err };
    }
  }
}
