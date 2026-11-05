import * as z from "zod";

export const AddressSchema = z.strictObject({
  careOf: z.string().max(255).nullish().describe("Care of line, e.g. c/o Jane Doe"),
  address: z
    .string()
    .max(255)
    .nullish()
    .describe(
      "Street and number only, e.g. Sihlquai 131. The postal code, city and country have their own fields.",
    ),
  postalCode: z.string().max(16).nullish().describe("Postal code, e.g. 8005"),
  city: z.string().max(255).nullish().describe("City, e.g. Zürich"),
  country: z.string().length(2).nullish().describe("ISO 3166-1 alpha-2 country code, e.g. CH"),
});
