import * as z from "zod";

export const encodeJsonBody = <T extends z.ZodType>({
  schema,
  body,
}: {
  schema: T;
  body: z.output<T>;
}): string => JSON.stringify(z.encode(schema, body));
