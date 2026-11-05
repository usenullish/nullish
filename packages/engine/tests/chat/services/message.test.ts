import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { MessageRole } from "@usenullish/nullish-schema/db";
import { ChatService } from "../../../src/chat/services/chat";
import { MessageService } from "../../../src/chat/services/message";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const argsFor = (userId: DbStoreInitArgs["userId"]): DbStoreInitArgs => ({
  db: db as unknown as DbStoreInitArgs["db"],
  userId,
});

const serviceFor = (userId: DbStoreInitArgs["userId"]): ChatService =>
  ChatService.create(argsFor(userId));

const initConversation = async ({
  userId,
  organizationId,
  message,
}: {
  userId: DbStoreInitArgs["userId"];
  organizationId: string | null;
  message: string;
}) => {
  const initialized = await serviceFor(userId).init({
    organizationId,
    conversationId: undefined,
    message,
  });

  if (initialized.status === "error") {
    throw initialized.err;
  }

  return initialized.result;
};

describe("MessageService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("record", () => {
    test("appends the messages after the message of the user", async () => {
      const { conversation } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: null,
        message: "Hello",
      });

      const toolCalls = [
        {
          id: "call_1",
          type: "function" as const,
          function: { name: "list_organizations", arguments: "{}" },
        },
      ];

      const service = MessageService.create({
        ...argsFor(TEST_USER_ID),
        conversationId: conversation.id,
      });

      const assistant = await service.record({
        message: { role: MessageRole.ASSISTANT, content: null, toolCalls },
      });
      const tool = await service.record({
        message: { role: MessageRole.TOOL, content: "[]", toolCallId: "call_1" },
      });

      if (assistant.status === "error" || tool.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(assistant.result.position).toBe(1);
      expect(assistant.result.toolCalls).toEqual(toolCalls);
      expect(tool.result.position).toBe(2);
      expect(tool.result.toolCallId).toBe("call_1");
    });
  });
});
