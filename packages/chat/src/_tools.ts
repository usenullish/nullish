// eslint-disable-next-line import/extensions
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
// eslint-disable-next-line import/extensions
import { CallToolResultSchema, type ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import {
  nonNullish,
  type Nullish,
  type Option,
  type Result,
  tryCatch,
  tryCatchSync,
} from "@usenullish/nullish-common";
import * as z from "zod";
import { ORGANIZATION_ID_ARG } from "./_constants";

const FunctionParametersPropertiesSchema = z.record(z.string(), z.unknown());

const FunctionParametersSchema = z.looseObject({
  properties: FunctionParametersPropertiesSchema.optional(),
  required: z.array(z.string()).optional(),
});

export class ChatTool {
  // The definition is what the model sees
  readonly #definition: ChatCompletionFunctionTool;

  // The annotations stay with the chat, which reads them as any MCP client would (e.g. whether a tool
  // only reads or may overwrite data)
  readonly #annotations: Nullish<ToolAnnotations>;

  private constructor({
    definition,
    annotations,
  }: {
    definition: ChatCompletionFunctionTool;
    annotations: Nullish<ToolAnnotations>;
  }) {
    this.#definition = definition;
    this.#annotations = annotations;
  }

  static create(args: {
    definition: ChatCompletionFunctionTool;
    annotations: Nullish<ToolAnnotations>;
  }): ChatTool {
    return new this(args);
  }

  get name(): string {
    return this.#definition.function.name;
  }

  get definition(): ChatCompletionFunctionTool {
    return this.#definition;
  }

  get annotations(): Nullish<ToolAnnotations> {
    return this.#annotations;
  }

  get parameters(): Option<z.infer<typeof FunctionParametersSchema>> {
    const { data } = FunctionParametersSchema.safeParse(this.#definition.function.parameters);

    return data;
  }

  get takesOrganizationId(): boolean {
    const { parameters } = this;

    return nonNullish(parameters?.properties) && ORGANIZATION_ID_ARG in parameters.properties;
  }
}

export const listTools = async ({ mcp }: { mcp: Client }): Promise<Result<ChatTool[]>> =>
  await tryCatch(async () => {
    const { tools } = await mcp.listTools();

    return tools.map(({ name, description, inputSchema, annotations }) =>
      ChatTool.create({
        definition: {
          type: "function",
          function: {
            name,
            description,
            parameters: inputSchema,
          },
        },
        annotations,
      }),
    );
  });

// The result is returned to the model as text, errors included, so that it can correct its next call
export const callTool = async ({
  mcp,
  name,
  args,
  injectedArgs = {},
}: {
  mcp: Client;
  name: string;
  args: string;
  // Arguments set by the chat, which take precedence over those of the model
  injectedArgs?: Record<string, unknown>;
}): Promise<{ content: string; structuredContent?: unknown; isError: boolean }> => {
  const parsedArgs = tryParseArgs({ args });

  if (parsedArgs.status === "error") {
    return {
      content: "The arguments are not valid JSON.",
      isError: true,
    };
  }

  const result = await tryCatch(
    async () => await mcp.callTool({ name, arguments: { ...parsedArgs.result, ...injectedArgs } }),
  );

  if (result.status === "error") {
    return {
      content: result.err instanceof Error ? result.err.message : "The tool call failed.",
      isError: true,
    };
  }

  const parsed = CallToolResultSchema.safeParse(result.result);

  if (!parsed.success) {
    return {
      content: "The tool returned an unexpected result.",
      isError: true,
    };
  }

  const { structuredContent, content, isError } = parsed.data;

  // The text parts of an MCP result are meant to be read by a model, the structured content is the
  // fallback when a tool returns none
  const text = content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");

  return {
    content: text !== "" ? text : JSON.stringify(structuredContent ?? {}),
    structuredContent,
    isError: isError === true,
  };
};

const ToolArgsSchema = z.record(z.string(), z.unknown());

const tryParseArgs = ({ args }: { args: string }): Result<Record<string, unknown>> => {
  const json = tryCatchSync((): unknown => JSON.parse(args === "" ? "{}" : args));

  if (json.status === "error") {
    return json;
  }

  const { success, data, error } = ToolArgsSchema.safeParse(json.result);

  return success ? { status: "success", result: data } : { status: "error", err: error };
};
