import { CoreSchema } from "./_schema";
import { DocumentType } from "../../constants/documents";
import { primaryKey } from "../_common";
import { organizationIdReference } from "./organizations";
import * as pg from "drizzle-orm/pg-core";
import { auditFields } from "../_audit";
import { sql } from "drizzle-orm";
import { organizationPolicies } from "../_policies";
import { languageCode } from "../_language";

export const documentType = CoreSchema.enum("document_type", DocumentType);

export const DocumentTemplatesSchema = CoreSchema.table(
  "document_templates",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    type: documentType().notNull(),
    name: pg.text().notNull(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "document_templates",
    }),
    pg
      .uniqueIndex("document_templates_org_type_name_uq")
      .on(table.organizationId, table.type, table.name),
  ],
);

const documentTemplateIdCascadeReference = () =>
  pg
    .uuid()
    .references(() => DocumentTemplatesSchema.id, { onDelete: "cascade" })
    .notNull();

export const TemplateContentsSchema = CoreSchema.table(
  "template_contents",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    templateId: documentTemplateIdCascadeReference(),
    language: languageCode().notNull(),
    html: pg.text().notNull(),
    ...auditFields(),
  },
  (table) => [
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "template_contents",
    }),
    pg.uniqueIndex("template_contents_template_language_uq").on(table.templateId, table.language),
    // Enforces max 256 KB (256 * 1024 = 262,144 characters in UTF-8)
    pg.check("template_contents_html_max_length", sql`char_length(${table.html}) <= 262144`),
  ],
);
