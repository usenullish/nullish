import * as pg from "drizzle-orm/pg-core";
import { LedgerSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReference } from "../core/organizations";
import { PostingsSchema } from "./journal";
import { auditFields } from "../_audit";
import { organizationPolicies } from "../_policies";

const postingIdReference = () =>
  pg
    .uuid()
    .references(() => PostingsSchema.id, { onDelete: "cascade" })
    .notNull();

export const PostingManualVatPostingsSchema = LedgerSchema.table(
  "posting_manual_vat_postings",
  {
    id: primaryKey(),
    organizationId: organizationIdReference(),
    postingId: postingIdReference(),
    vatPostingId: postingIdReference(),
    ...auditFields(),
  },
  (table) => [
    pg.uniqueIndex("posting_manual_vat_postings_vat_posting_id_uidx").on(table.vatPostingId),
    pg.index("posting_manual_vat_postings_posting_id_idx").on(table.postingId),
    ...organizationPolicies({
      organizationId: table.organizationId,
      tableName: "posting_manual_vat_postings",
    }),
  ],
);
