import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { ApiEnv } from "../../../src/api/types/api";
import { assertLlmEnabledMiddleware } from "../../../src/api/middlewares/llm-enabled";

describe("llm enabled", () => {
  const KEYS = ["NULLISH_LLM_URL", "NULLISH_LLM_CHAT_MODEL", "NULLISH_LLM_API_KEY"] as const;

  const saved = new Map<string, string | undefined>();

  const request = async (): Promise<Response> => {
    const app = new Hono<ApiEnv>();

    app.post("/chat", assertLlmEnabledMiddleware, (context) => context.text("passed"));

    return await app.request("/chat", { method: "POST" });
  };

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
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

  describe("assertLlmEnabledMiddleware", () => {
    test("lets the request through when the LLM is configured", async () => {
      process.env.NULLISH_LLM_URL = "https://llm.example.com/v1";
      process.env.NULLISH_LLM_CHAT_MODEL = "qwen3.5:9b";
      process.env.NULLISH_LLM_API_KEY = "sk-test";

      const response = await request();

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("passed");
    });

    test.each(KEYS.map((key) => [key]))(
      "answers 503 when %s is not defined",
      async (key: string) => {
        process.env.NULLISH_LLM_URL = "https://llm.example.com/v1";
        process.env.NULLISH_LLM_CHAT_MODEL = "qwen3.5:9b";
        process.env.NULLISH_LLM_API_KEY = "sk-test";
        delete process.env[key];

        const response = await request();

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual(
          expect.objectContaining({ code: ErrorCode.REJECTED }),
        );
      },
    );
  });
});
