import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, DocumentType } from "@usenullish/nullish-schema/db";
import { causeMessage, createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const documentTemplates = DbSchema.Core.Documents.DocumentTemplatesSchema;

const createTemplate = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(documentTemplates)
    .values({ organizationId, type: DocumentType.INVOICE, name: crypto.randomUUID() })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("check_organization_immutable", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("rejects changing organization_id once set", async () => {
    const templateId = await createTemplate(organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(documentTemplates)
      .set({ organizationId: otherOrganizationId })
      .where(eq(documentTemplates.id, templateId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing unrelated fields", async () => {
    const templateId = await createTemplate(organizationId);

    const [updated] = await db
      .update(documentTemplates)
      .set({ name: "Renamed Template" })
      .where(eq(documentTemplates.id, templateId))
      .returning();

    expect(updated?.name).toBe("Renamed Template");
  });
});
