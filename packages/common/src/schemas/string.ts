import * as z from "zod";

// TODO: cap the length of the strings (e.g. the search filters of the lists) to prevent
// arbitrarily large inputs.
export const NotEmptyStringSchema = z.string().trim().min(1, { message: "Required" });
