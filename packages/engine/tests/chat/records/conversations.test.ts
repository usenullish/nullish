import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import {
  DbCollectionConversations,
  DbConversations,
} from "../../../src/chat/records/conversations";
import { DbCollectionMessages } from "../../../src/chat/records/messages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, MessageRole } from "@usenullish/nullish-schema/db";
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

const storeFor = (userId: DbStoreInitArgs["userId"]): DbConversations =>
  DbConversations.create({ db: db as unknown as DbStoreInitArgs["db"], userId });

describe("conversations", () => {
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

  describe("insert", () => {
    test("creates the conversation for the current user", async () => {
      const result = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: orgId, title: "Clients" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.userId).toBe(TEST_USER_ID);
      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.title).toBe("Clients");
      expect(result.result.version).toBe(1);
    });

    test("creates a conversation without organization", async () => {
      const result = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: null },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBeNull();
    });

    test("returns an error Result for an organization the user does not belong to", async () => {
      const result = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: otherOrgId, title: null },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("findById", () => {
    test("returns a conversation of the current user", async () => {
      const created = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: "Mine" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).find({
        pKey: created.result.id,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.title).toBe("Mine");
    });

    test("resolves to undefined for a conversation of another user", async () => {
      const created = await storeFor(TEST_OTHER_USER_ID).insert({
        values: { organizationId: null, title: "Not mine" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).find({ pKey: created.result.id });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await storeFor(TEST_USER_ID).find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("list", () => {
    test("returns only the conversations of the current user", async () => {
      await storeFor(TEST_OTHER_USER_ID).insert({
        values: { organizationId: null, title: "Other" },
      });

      const result = await storeFor(TEST_USER_ID).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "updatedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(result.result.every(({ userId }) => userId === TEST_USER_ID)).toBeTrue();
    });
  });

  describe("list without organization", () => {
    test("returns only the conversations without organization", async () => {
      const ownOrgId = await createOrganization(db, TEST_USER_ID);

      const inOrganization = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: ownOrgId, title: "In organization" },
      });
      const unscoped = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: "Unscoped" },
      });

      if (inOrganization.status === "error" || unscoped.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "updatedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const ids = result.result.map(({ id }) => id);

      expect(ids).toContain(unscoped.result.id);
      expect(ids).not.toContain(inOrganization.result.id);
      expect(result.result.every(({ organizationId }) => organizationId === null)).toBeTrue();
    });
  });

  describe("list of an organization", () => {
    test("returns only the conversations of the organization", async () => {
      const ownOrgId = await createOrganization(db, TEST_USER_ID);
      const secondOrgId = await createOrganization(db, TEST_USER_ID);

      const inOrganization = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: ownOrgId, title: "In organization" },
      });
      const inSecondOrganization = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: secondOrgId, title: "In second organization" },
      });
      const unscoped = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: "Unscoped" },
      });

      if (
        inOrganization.status === "error" ||
        inSecondOrganization.status === "error" ||
        unscoped.status === "error"
      ) {
        expect(true).toBeFalse();
        return;
      }

      const result = await DbCollectionConversations.create({
        db: db as unknown as DbStoreInitArgs["db"],
        userId: TEST_USER_ID,
        foreignKeyId: ownOrgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "updatedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual([inOrganization.result.id]);
    });
  });

  describe("update", () => {
    test("applies the change and bumps the version", async () => {
      const created = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: null },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).update({
        pKey: created.result.id,
        values: { version: created.result.version, title: "Renamed" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBeNull();
      expect(result.result.title).toBe("Renamed");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result when moving to an organization, even one the user belongs to", async () => {
      const created = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: null },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).update({
        pKey: created.result.id,
        values: { version: created.result.version, organizationId: orgId },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("delete", () => {
    test("deletes a conversation of the current user and returns it", async () => {
      const created = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: orgId, title: "Clients" },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).delete({ pKey: created.result.id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(created.result.id);
      expect(await storeFor(TEST_USER_ID).find({ pKey: created.result.id })).toEqual({
        status: "success",
        result: undefined,
      });
    });

    test("resolves to undefined and keeps a conversation of another user", async () => {
      const created = await storeFor(TEST_OTHER_USER_ID).insert({
        values: { organizationId: otherOrgId, title: null },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await storeFor(TEST_USER_ID).delete({ pKey: created.result.id });

      expect(result).toEqual({ status: "success", result: undefined });

      const found = await storeFor(TEST_OTHER_USER_ID).find({
        pKey: created.result.id,
      });

      if (found.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(found.result?.id).toBe(created.result.id);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await storeFor(TEST_USER_ID).delete({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
  describe("after leaving an organization", () => {
    const memberships = DbSchema.Core.Memberships.MembershipsSchema;

    let leftOrgId: string;
    let conversationId: string;
    let unscopedConversationId: string;

    beforeAll(async () => {
      leftOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

      await db
        .insert(memberships)
        .values({ organizationId: leftOrgId, userId: TEST_USER_ID, role: "accountant" });

      const conversation = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: leftOrgId, title: "Left" },
      });
      const unscoped = await storeFor(TEST_USER_ID).insert({
        values: { organizationId: null, title: "Kept" },
      });

      if (conversation.status === "error" || unscoped.status === "error") {
        throw new Error("The conversations could not be created");
      }

      conversationId = conversation.result.id;
      unscopedConversationId = unscoped.result.id;

      await DbCollectionMessages.create({
        db: db as unknown as DbStoreInitArgs["db"],
        userId: TEST_USER_ID,
        foreignKeyId: conversationId,
      }).insert({ values: { role: MessageRole.USER, content: "Hello" } });

      await db
        .delete(memberships)
        .where(
          and(eq(memberships.organizationId, leftOrgId), eq(memberships.userId, TEST_USER_ID)),
        );
    });

    test("does not find a conversation of that organization", async () => {
      const result = await storeFor(TEST_USER_ID).find({ pKey: conversationId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("does not list the conversations of that organization", async () => {
      const result = await storeFor(TEST_USER_ID).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "updatedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const ids = result.result.map(({ id }) => id);

      expect(ids).not.toContain(conversationId);
      expect(ids).toContain(unscopedConversationId);
    });

    test("does not list the messages of a conversation of that organization", async () => {
      const result = await DbCollectionMessages.create({
        db: db as unknown as DbStoreInitArgs["db"],
        userId: TEST_USER_ID,
        foreignKeyId: conversationId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "position", direction: "asc" },
      });

      expect(result).toEqual({ status: "success", result: [] });
    });
  });
});
