import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/bun-sql";
import { apiKey } from "@better-auth/api-key";
import { API_KEY_CONFIG } from "./src/_constants";
import { twoFactor } from "better-auth/plugins";

const db = drizzle("postgresql://username:password@localhost:5432/nullish");

/**
 * A configuration used only to generate the schema for the authentication. Is not - and must not - used anywhere.
 * $: bunx --bun auth generate --config better-auth.config.ts
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schemaName: "auth",
  }),
  plugins: [twoFactor(), apiKey(API_KEY_CONFIG)],
});
