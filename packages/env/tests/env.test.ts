import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  envAuthSecret,
  envAuthUrl,
  envDataDir,
  envDbMigrationsFolder,
  envDbUrl,
  envLlmApiKey,
  envLlmEnabled,
  envLlmUrl,
  envLlmChatModel,
  envLlmChatTokenLimit,
  envSignUp,
  LlmTokenLimitPeriod,
} from "../src";

describe("env", () => {
  const KEYS = [
    "NODE_ENV",
    "NULLISH_DB_NAME",
    "NULLISH_DB_HOST",
    "NULLISH_DB_PORT",
    "NULLISH_DB_USERNAME",
    "NULLISH_DB_PASSWORD",
    "NULLISH_LLM_URL",
    "NULLISH_LLM_CHAT_MODEL",
    "NULLISH_LLM_API_KEY",
    "NULLISH_LLM_CHAT_TOKEN_LIMIT",
    "NULLISH_LLM_CHAT_TOKEN_LIMIT_PERIOD",
    "NULLISH_AUTH_SIGN_UP",
    "NULLISH_AUTH_URL",
    "NULLISH_AUTH_SECRET",
  ] as const;

  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe("envDataDir", () => {
    test("returns the dev data dir outside production", () => {
      expect(envDataDir().endsWith(".nullish/data")).toBe(true);
    });

    test("returns the prod data dir in production", () => {
      process.env.NODE_ENV = "production";

      expect(envDataDir()).toBe("/data");
    });
  });

  describe("envDbUrl", () => {
    beforeEach(() => {
      process.env.NULLISH_DB_HOST = "localhost";
      process.env.NULLISH_DB_PORT = "5432";
      process.env.NULLISH_DB_USERNAME = "username";
      process.env.NULLISH_DB_PASSWORD = "password";
    });

    test("builds the url from the NULLISH_DB variables", () => {
      expect(envDbUrl()).toBe("postgresql://username:password@localhost:5432/nullish");
    });

    test("builds the same url in production", () => {
      process.env.NODE_ENV = "production";

      expect(envDbUrl()).toBe("postgresql://username:password@localhost:5432/nullish");
    });

    test("honors NULLISH_DB_NAME", () => {
      process.env.NULLISH_DB_NAME = "nullish_test";

      expect(envDbUrl()).toBe("postgresql://username:password@localhost:5432/nullish_test");
    });

    test.each([
      ["NULLISH_DB_HOST", "A host for the DB must be defined."],
      ["NULLISH_DB_PORT", "A port for the DB must be defined."],
      ["NULLISH_DB_USERNAME", "A username for the DB must be defined."],
      ["NULLISH_DB_PASSWORD", "A password for the DB must be defined."],
    ])("throws when %s is unset", (key, message) => {
      delete process.env[key];

      expect(() => envDbUrl()).toThrow(message);
    });

    test.each([
      ["NULLISH_DB_HOST", "A host for the DB must be defined."],
      ["NULLISH_DB_PORT", "A port for the DB must be defined."],
      ["NULLISH_DB_USERNAME", "A username for the DB must be defined."],
      ["NULLISH_DB_PASSWORD", "A password for the DB must be defined."],
    ])("throws when %s is empty", (key, message) => {
      process.env[key] = "";

      expect(() => envDbUrl()).toThrow(message);
    });

    test.each(["5432abc", "Infinity"])("throws for the port %p", (port) => {
      process.env.NULLISH_DB_PORT = port;

      expect(() => envDbUrl()).toThrow("The port for the DB must be a number");
    });
  });

  describe("envDbMigrationsFolder", () => {
    test("resolves to the dev migrations folder by default", () => {
      expect(envDbMigrationsFolder().endsWith(join("packages", "db", "migrations"))).toBe(true);
    });

    test("resolves to the packages/db/migrations path in production", () => {
      process.env.NODE_ENV = "production";

      expect(envDbMigrationsFolder()).toBe(join("packages", "db", "migrations"));
    });
  });

  describe.each([
    {
      name: "envLlmUrl",
      fn: envLlmUrl,
      key: "NULLISH_LLM_URL",
      value: "https://llm.example.com/v1",
    },
    {
      name: "envLlmChatModel",
      fn: envLlmChatModel,
      key: "NULLISH_LLM_CHAT_MODEL",
      value: "qwen3.5:9b",
    },
    { name: "envLlmApiKey", fn: envLlmApiKey, key: "NULLISH_LLM_API_KEY", value: "sk-test" },
  ] as const)("$name", ({ fn, key, value }) => {
    test("reads the variable in dev", () => {
      process.env[key] = value;

      expect(fn()).toBe(value);
    });

    test("reads the variable in production", () => {
      process.env.NODE_ENV = "production";
      process.env[key] = value;

      expect(fn()).toBe(value);
    });

    test("throws when unset", () => {
      expect(() => fn()).toThrow();
    });

    test("throws when empty", () => {
      process.env[key] = "";

      expect(() => fn()).toThrow();
    });
  });

  describe("envLlmEnabled", () => {
    const configure = () => {
      process.env.NULLISH_LLM_URL = "https://llm.example.com/v1";
      process.env.NULLISH_LLM_CHAT_MODEL = "qwen3.5:9b";
      process.env.NULLISH_LLM_API_KEY = "sk-test";
    };

    test("is enabled when the URL, the model and the API key are defined", () => {
      configure();

      expect(envLlmEnabled()).toBeTrue();
    });

    test("is disabled when nothing is defined", () => {
      expect(envLlmEnabled()).toBeFalse();
    });

    test.each(["NULLISH_LLM_URL", "NULLISH_LLM_CHAT_MODEL", "NULLISH_LLM_API_KEY"])(
      "is disabled when %s is missing",
      (key) => {
        configure();
        delete process.env[key];

        expect(envLlmEnabled()).toBeFalse();
      },
    );

    test.each(["NULLISH_LLM_URL", "NULLISH_LLM_CHAT_MODEL", "NULLISH_LLM_API_KEY"])(
      "is disabled when %s is empty",
      (key) => {
        configure();
        process.env[key] = "";

        expect(envLlmEnabled()).toBeFalse();
      },
    );
  });

  describe("envLlmChatTokenLimit", () => {
    test("returns no limit when NULLISH_LLM_CHAT_TOKEN_LIMIT is unset", () => {
      expect(envLlmChatTokenLimit()).toBeUndefined();
    });

    test("returns no limit when NULLISH_LLM_CHAT_TOKEN_LIMIT is empty", () => {
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = "";

      expect(envLlmChatTokenLimit()).toBeUndefined();
    });

    test("defaults the period to weekly", () => {
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = "100000";

      expect(envLlmChatTokenLimit()).toEqual({
        tokens: 100_000n,
        period: LlmTokenLimitPeriod.WEEKLY,
      });
    });

    test.each(Object.values(LlmTokenLimitPeriod))("reads the %s period", (period) => {
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = "5000";
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT_PERIOD = period;

      expect(envLlmChatTokenLimit()).toEqual({ tokens: 5000n, period });
    });

    test("applies in production as well", () => {
      process.env.NODE_ENV = "production";
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = "5000";

      expect(envLlmChatTokenLimit()?.tokens).toBe(5000n);
    });

    test.each(["abc", "0", "-10", "1.5"])("throws for the limit %p", (tokens) => {
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = tokens;

      expect(() => envLlmChatTokenLimit()).toThrow();
    });

    test("throws for an unknown period", () => {
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT = "5000";
      process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT_PERIOD = "yearly";

      expect(() => envLlmChatTokenLimit()).toThrow();
    });
  });

  describe("envSignUp", () => {
    test("defaults to invite_only when NULLISH_AUTH_SIGN_UP is unset", () => {
      expect(envSignUp()).toBe("invite_only");
    });

    test("defaults to invite_only when NULLISH_AUTH_SIGN_UP is empty", () => {
      process.env.NULLISH_AUTH_SIGN_UP = "";

      expect(envSignUp()).toBe("invite_only");
    });

    test.each(["development", "production", "test"])(
      "defaults to invite_only in %p when NULLISH_AUTH_SIGN_UP is unset",
      (nodeEnv) => {
        process.env.NODE_ENV = nodeEnv;

        expect(envSignUp()).toBe("invite_only");
      },
    );

    test.each([
      ["true", true],
      ["false", false],
      ["invite_only", "invite_only"],
    ] as const)("parses %p", (signUp, expected) => {
      process.env.NULLISH_AUTH_SIGN_UP = signUp;

      expect(envSignUp()).toBe(expected);
    });

    test.each(["yes", "1", "invite-only", "TRUE"])("throws for %p", (signUp) => {
      process.env.NULLISH_AUTH_SIGN_UP = signUp;

      expect(() => envSignUp()).toThrow();
    });
  });

  describe.each([
    {
      name: "envAuthUrl",
      fn: envAuthUrl,
      key: "NULLISH_AUTH_URL",
      value: "https://nullish.example.com",
    },
    {
      name: "envAuthSecret",
      fn: envAuthSecret,
      key: "NULLISH_AUTH_SECRET",
      value: "a-secret-of-at-least-32-characters",
    },
  ] as const)("$name", ({ fn, key, value }) => {
    test("reads the variable", () => {
      process.env[key] = value;

      expect(fn()).toBe(value);
    });

    test("throws when unset", () => {
      expect(() => fn()).toThrow();
    });

    test("throws when empty", () => {
      process.env[key] = "";

      expect(() => fn()).toThrow();
    });
  });

  describe("envAuthSecret length", () => {
    test("accepts a secret of 32 characters", () => {
      process.env.NULLISH_AUTH_SECRET = "a".repeat(32);

      expect(envAuthSecret()).toBe("a".repeat(32));
    });

    test("throws for a secret shorter than 32 characters", () => {
      process.env.NULLISH_AUTH_SECRET = "a".repeat(31);

      expect(() => envAuthSecret()).toThrow("at least 32 characters long");
    });
  });
});
