// eslint-disable-next-line import/extensions
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { Result } from "@usenullish/nullish-common";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { toApiError } from "../_errors";
import { McpOutputSchemas } from "./_output-schemas";

/**
 * Source: https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/
 * readOnlyHint: Does the tool modify its environment?
 * destructiveHint: If it does modify things, is the change destructive (as opposed to additive)?
 * idempotentHint: Can you safely call it again with the same arguments?
 * openWorldHint: Does the tool interact with an open world of external entities, or is its domain closed?
 */

export const READ_ONLY_TOOL: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
};

export const WRITE_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false,
};

export const UPDATE_TOOL: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

export const DELETE_TOOL: ToolAnnotations = {
  ...UPDATE_TOOL,
};

export const DESTRUCTIVE_TOOL: ToolAnnotations = {
  ...UPDATE_TOOL,
  idempotentHint: false,
};

export interface McpToolsInitArgs<Args extends DbStoreInitArgs = DbStoreInitArgs> {
  server: McpServer;
  args: Args;
  readOnly: boolean;
}

export abstract class McpTools<Args extends DbStoreInitArgs = DbStoreInitArgs> {
  readonly #server: McpServer;
  readonly #args: Args;
  readonly #readOnly: boolean;

  protected constructor({ server, args, readOnly }: McpToolsInitArgs<Args>) {
    this.#server = server;
    this.#args = args;
    this.#readOnly = readOnly;
  }

  protected get _args(): Args {
    return this.#args;
  }

  registerTools(): void {
    this.registerReadOnlyTools();

    if (!this.#readOnly) {
      this.registerWriteTools();
    }
  }

  abstract registerReadOnlyTools(): void;
  abstract registerWriteTools(): void;

  protected registerTool<T, R>({
    title,
    description,
    annotations,
    inputSchema,
    outputSchema,
    fn,
  }: {
    title: string;
    description: string;
    annotations: ToolAnnotations;
    inputSchema: z.ZodType<T>;
    outputSchema: z.ZodType<R>;
    fn: (args: T) => Promise<Result<R>>;
  }): void {
    this.#server.registerTool(
      title,
      {
        description,
        annotations,
        inputSchema,
        outputSchema: McpOutputSchemas.create().encode(outputSchema),
      },
      async (args): Promise<CallToolResult> => {
        const fnResult = await fn(args);

        if (fnResult.status === "error") {
          const { err } = fnResult;

          console.error(err);

          return {
            isError: true,
            content: [{ type: "text", text: this.#toErrorMessage({ err, title }) }],
          };
        }

        const { result } = fnResult;

        return {
          structuredContent: { result },
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );
  }

  #toErrorMessage({ err, title }: { err: unknown; title: string }): string {
    return toApiError({ err, fallback: `Failed to execute ${title}.` }).error;
  }

  protected mapResult<T, R>(result: Result<T>, map: (value: T) => R): Result<R> {
    if (result.status === "error") {
      return result;
    }

    return { status: "success", result: map(result.result) };
  }
}
