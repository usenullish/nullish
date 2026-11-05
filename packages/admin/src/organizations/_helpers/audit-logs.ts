import { eq } from "drizzle-orm";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";

const logs = DbSchema.Audit.Logs.LogsSchema;

type Organization = Records["Core"]["Organizations"]["Select"];

export const deleteAuditLogs = async ({
  tx,
  organizationId,
}: {
  tx: Tx;
  organizationId: Organization["id"];
}): Promise<void> => {
  await tx.delete(logs).where(eq(logs.organizationId, organizationId));
};
