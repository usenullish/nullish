import { CoreSchema } from "./_schema";
import { primaryKey } from "../_common";
import { organizationIdReferenceOptional } from "./organizations";
import { auditFields } from "../_audit";
import { timestamp } from "../_temporal";
import { checkHashFormat, hash } from "../_hash";
import * as pg from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { membershipRole } from "./memberships";
import { invitationPolicies } from "../_policies";

export const InvitationsSchema = CoreSchema.table(
  "invitations",
  {
    id: primaryKey(),
    organizationId: organizationIdReferenceOptional({ onDelete: "cascade" }).notNull(),
    email: pg.text().notNull(),
    role: membershipRole().notNull(),
    tokenHash: hash().notNull(),
    expiresAt: timestamp()
      .notNull()
      .default(sql`now() + interval '7 days'`),
    ...auditFields(),
  },
  (table) => [
    pg
      .uniqueIndex("invitations_org_email_uidx")
      .on(table.organizationId, sql`lower(${table.email})`),
    pg.uniqueIndex("invitations_token_hash_uidx").on(table.tokenHash),
    checkHashFormat({ name: "invitations_token_hash_format", column: table.tokenHash }),
    ...invitationPolicies({
      organizationId: table.organizationId,
    }),
  ],
);
