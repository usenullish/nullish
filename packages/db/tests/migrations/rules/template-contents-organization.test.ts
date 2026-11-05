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
const templateContents = DbSchema.Core.Documents.TemplateContentsSchema;

const createTemplate = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(documentTemplates)
    .values({ organizationId, type: DocumentType.INVOICE, name: crypto.randomUUID() })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const insertContent = ({
  organizationId,
  templateId,
}: {
  organizationId: string;
  templateId: string;
}) =>
  db
    .insert(templateContents)
    .values({ organizationId, templateId, language: "en", html: "<html></html>" })
    .returning();

describe("check_template_contents_organization", () => {
  let organizationId: string;
  let templateId: string;
  let otherOrganizationId: string;
  let otherTemplateId: string;

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
    templateId = await createTemplate(organizationId);

    otherOrganizationId = await createOrganization(db);
    otherTemplateId = await createTemplate(otherOrganizationId);
  });

  test("accepts a content with the organization of its template", async () => {
    const [row] = await insertContent({ organizationId, templateId });

    expect(row?.organizationId).toBe(organizationId);
  });

  test("rejects a content with another organization than its template", async () => {
    const error = await insertContent({ organizationId: otherOrganizationId, templateId }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent core.document_templates",
    );
  });

  test("rejects changing the organization of a content", async () => {
    const [row] = await insertContent({ organizationId, templateId });
    assertNonNullish(row);

    const error = await db
      .update(templateContents)
      .set({ organizationId: otherOrganizationId })
      .where(eq(templateContents.id, row.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent core.document_templates",
    );
  });

  test("rejects moving a content to a template of another organization", async () => {
    const [row] = await insertContent({ organizationId, templateId });
    assertNonNullish(row);

    const error = await db
      .update(templateContents)
      .set({ templateId: otherTemplateId })
      .where(eq(templateContents.id, row.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "organization_id must match the parent core.document_templates",
    );
  });
});
