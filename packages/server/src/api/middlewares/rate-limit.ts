import { rateLimiter } from "hono-rate-limiter";
import { assertNonNullish, isNullish } from "@usenullish/nullish-common";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../types/api";
import { errorResponse } from "../_errors";

// Requests per minute and per user (whether through a session or api-key)
export const RATE_LIMITS = {
  api: 300,
  pdfGenerate: 10,
  statementsImport: 5,
  datasetsUpload: 10,
  migrationsRun: 5,
} as const;

const WINDOW_MS = 60 * 1000; // Remember a request for a minute

// Limits the requests of a user, whether authenticated by a session or an API key, so that adding
// API keys does not raise the budget - i.e. whenever a user calls with a session or with any of their api-key.
// Each API key is also limited on its own beforehand, when
// better-auth verifies it (API_KEY_CONFIG.rateLimit).
// Requests without a caller (auth routes, health, docs) are left out.
export const userRateLimitMiddleware = ({ limit }: { limit: number }) =>
  rateLimiter<ApiEnv>({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    skip: (context) => isNullish(context.var.caller),
    keyGenerator: (context) => {
      assertNonNullish(context.var.caller);
      return context.var.caller.userId;
    },
    handler: (context) =>
      errorResponse({
        context,
        error: "Too many requests. Try again later.",
        code: ErrorCode.LIMITED,
        status: 429,
      }),
  });
