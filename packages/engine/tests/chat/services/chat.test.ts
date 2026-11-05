import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { MessageRole, QUERY_MAX_PAGINATION } from "@usenullish/nullish-schema/db";
import { ChatService } from "../../../src/chat/services/chat";
import { MessageService } from "../../../src/chat/services/message";
import { DbCollectionMessages } from "../../../src/chat/records/messages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

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

const listMessages = async ({
  userId,
  conversationId,
}: {
  userId: DbStoreInitArgs["userId"];
  conversationId: string;
}) => {
  const listed = await DbCollectionMessages.create({
    ...argsFor(userId),
    foreignKeyId: conversationId,
  }).list({
    pagination: { limit: QUERY_MAX_PAGINATION, offset: 0 },
    sort: { field: "position", direction: "asc" },
  });

  if (listed.status === "error") {
    throw listed.err;
  }

  return listed.result;
};

describe("ChatService", () => {
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("init", () => {
    test("creates a conversation titled with the first message and records it", async () => {
      const { conversation, history } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: orgId,
        message: "Create an invoice",
      });

      expect(conversation.title).toBe("Create an invoice");
      expect(conversation.organizationId).toBe(orgId);
      expect(history).toEqual([]);

      const messages = await listMessages({
        userId: TEST_USER_ID,
        conversationId: conversation.id,
      });

      expect(messages.map(({ role, content }) => ({ role, content }))).toEqual([
        { role: MessageRole.USER, content: "Create an invoice" },
      ]);
    });

    test("creates a conversation without organization", async () => {
      const { conversation } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: null,
        message: "Hello",
      });

      expect(conversation.organizationId).toBeNull();
    });

    test("truncates the title to 100 characters", async () => {
      const { conversation } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: null,
        message: "a".repeat(150),
      });

      expect(conversation.title).toBe("a".repeat(100));
    });

    test("continues a conversation with its history in order", async () => {
      const { conversation } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: null,
        message: "First",
      });

      const recorded = await MessageService.create({
        ...argsFor(TEST_USER_ID),
        conversationId: conversation.id,
      }).record({
        message: { role: MessageRole.ASSISTANT, content: "Answer" },
      });

      expect(recorded.status).toBe("success");

      const continued = await serviceFor(TEST_USER_ID).init({
        organizationId: null,
        conversationId: conversation.id,
        message: "Second",
      });

      if (continued.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(continued.result.conversation.id).toBe(conversation.id);
      expect(continued.result.history.map(({ content }) => content)).toEqual(["First", "Answer"]);

      const messages = await listMessages({
        userId: TEST_USER_ID,
        conversationId: conversation.id,
      });

      expect(messages.map(({ content }) => content)).toEqual(["First", "Answer", "Second"]);
    });

    test("returns an error Result for an organization the user does not belong to", async () => {
      const initialized = await serviceFor(TEST_USER_ID).init({
        organizationId: otherOrgId,
        conversationId: undefined,
        message: "Hello",
      });

      expect(initialized.status).toBe("error");
    });

    test("returns an error Result for an unknown conversation", async () => {
      const initialized = await serviceFor(TEST_USER_ID).init({
        organizationId: null,
        conversationId: TEST_MISSING_ID,
        message: "Hello",
      });

      expect(initialized.status).toBe("error");
    });

    test.each([
      ["without organization", "in an organization", null, "org"],
      ["in an organization", "without organization", "org", null],
    ])(
      "returns an error Result for a conversation started %s and resumed %s",
      async (_started, _resumed, startedIn, resumedIn) => {
        const { conversation } = await initConversation({
          userId: TEST_USER_ID,
          organizationId: startedIn === "org" ? orgId : null,
          message: "First",
        });

        const initialized = await serviceFor(TEST_USER_ID).init({
          organizationId: resumedIn === "org" ? orgId : null,
          conversationId: conversation.id,
          message: "Second",
        });

        expect(initialized.status).toBe("error");

        const messages = await listMessages({
          userId: TEST_USER_ID,
          conversationId: conversation.id,
        });

        expect(messages.map(({ content }) => content)).toEqual(["First"]);
      },
    );

    test("continues a conversation in the organization it was started in", async () => {
      const { conversation } = await initConversation({
        userId: TEST_USER_ID,
        organizationId: orgId,
        message: "First",
      });

      const initialized = await serviceFor(TEST_USER_ID).init({
        organizationId: orgId,
        conversationId: conversation.id,
        message: "Second",
      });

      expect(initialized.status).toBe("success");
    });

    test("returns an error Result for the conversation of another user", async () => {
      const { conversation } = await initConversation({
        userId: TEST_OTHER_USER_ID,
        organizationId: null,
        message: "Private",
      });

      const initialized = await serviceFor(TEST_USER_ID).init({
        organizationId: null,
        conversationId: conversation.id,
        message: "Hello",
      });

      expect(initialized.status).toBe("error");

      const messages = await listMessages({
        userId: TEST_OTHER_USER_ID,
        conversationId: conversation.id,
      });

      expect(messages.map(({ content }) => content)).toEqual(["Private"]);
    });
  });
});
