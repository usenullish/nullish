import * as z from "zod";

export const IbanSchema = z
  .iban()
  .describe("IBAN in uppercase without spaces, e.g. CH9300762011623852957");
