import type { ApiKeyConfigurationOptions } from "@better-auth/api-key";
import {
  API_KEY_DEFAULT_EXPIRATION_DAYS,
  API_KEY_MAX_EXPIRATION_DAYS,
  ApiKeyAction,
  ApiKeyResource,
} from "@usenullish/nullish-schema/auth";
import type { BetterAuthOptions } from "better-auth";
import type { TwoFactorOptions } from "better-auth/plugins";

export const BASE_PATH = "/auth";

// ⚠️ Using e.g. nullish::auth would break the sign-in because better-auth.parseCookies does not support such pattern
export const COOKIE_PREFIX = "nullish-auth";

// Hardcoded in Better Auth
export const COOKIE_NAME = "session_token";

export const INVITATION_TOKEN_HEADER = "x-invitation-token";

export const API_KEY_CONFIG: ApiKeyConfigurationOptions = {
  defaultPrefix: "nullish_",
  keyExpiration: {
    // ⚠️ Documented in milliseconds but effectively seconds.
    defaultExpiresIn: API_KEY_DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60, // 7 days
    maxExpiresIn: API_KEY_MAX_EXPIRATION_DAYS, // 365 days
  },
  enableMetadata: false,
  permissions: {
    defaultPermissions: {
      [ApiKeyResource.MCP]: [ApiKeyAction.READ],
    },
  },
  rateLimit: {
    enabled: true,
    timeWindow: 60 * 1000, // A minute
    maxRequests: 60 * 2, // Two requests par seconds
  },
};

export const MAIL_RATE_LIMITS = {
  burst: {
    timeWindow: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  daily: {
    timeWindow: 24 * 60 * 60 * 1000, // A day
    maxRequests: 10,
  },
} as const;

export const SESSION: Required<
  Pick<NonNullable<BetterAuthOptions["session"]>, "expiresIn" | "updateAge">
> = {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
};

// We use similar defaults for 2FA as better-auth.
export const TWO_FACTOR_CONFIG = {
  issuer: "nullish",
  totpOptions: {
    digits: 6,
    period: 30, // Seconds
  },
  backupCodeOptions: {
    length: 10,
  },
  trustDeviceMaxAge: 30 * 24 * 60 * 60, // 30 days in seconds
} satisfies TwoFactorOptions;
