import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { findConversationById } from "../../../src/chat/_helpers/conversations";
import { DbConversations } from "../../../src/chat/records/conversations";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_MISSING_ID, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("chat/_helpers/conversations", () => {
  let conversationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    const created = await DbConversations.create({
      db: db as unknown as DbStoreInitArgs["db"],
      userId: TEST_USER_ID,
    }).insert({ values: { organizationId: null, title: "Hello" } });

    if (created.status === "error") {
      throw created.err;
    }

    conversationId = created.result.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("findConversationById", () => {
    test("returns the conversation matching the id", async () => {
      const conversation = await db.transaction((tx) =>
        findConversationById({ tx, id: conversationId }),
      );

      expect(conversation?.id).toBe(conversationId);
      expect(conversation?.title).toBe("Hello");
    });

    test("resolves to undefined when the id matches nothing", async () => {
      const conversation = await db.transaction((tx) =>
        findConversationById({ tx, id: TEST_MISSING_ID }),
      );

      expect(conversation).toBeUndefined();
    });
  });
});
