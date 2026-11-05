import * as z from "zod";

export const NumericStringSchema = z.templateLiteral([z.number()]);
