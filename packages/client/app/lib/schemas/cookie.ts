import * as z from "zod";

const CookieSchema = z.string();

export type Cookie = z.infer<typeof CookieSchema>;
