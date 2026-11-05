import * as z from "zod";
import { isNullish, nonNullish, type Nullish } from "@usenullish/nullish-common";

// Codecs (dates, bigints) cannot be represented in JSON Schema on their decoded side, which is
// what the SDK uses to describe the output. Tools return the encoded (wire) values, therefore we
// describe and validate the output with the encoded shape of the schema.
export class McpOutputSchemas {
  static #instance: Nullish<McpOutputSchemas>;

  // The tools are registered on every request, so the conversions are cached for the lifetime of
  // the process to improve performances.
  readonly #encodedSchemas = new WeakMap<z.ZodType, z.ZodType>();

  private constructor() {}

  static create(): McpOutputSchemas {
    if (isNullish(McpOutputSchemas.#instance)) {
      McpOutputSchemas.#instance = new McpOutputSchemas();
    }

    return McpOutputSchemas.#instance;
  }

  encode(outputSchema: z.ZodType): z.ZodType {
    const cached = this.#encodedSchemas.get(outputSchema);

    if (nonNullish(cached)) {
      return cached;
    }

    const encoded = z.strictObject({
      result: z.fromJSONSchema(z.toJSONSchema(outputSchema, { io: "input" })),
    });

    this.#encodedSchemas.set(outputSchema, encoded);

    return encoded;
  }
}
