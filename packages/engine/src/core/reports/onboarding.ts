import { eq, exists, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Records } from "@usenullish/nullish-schema/records";
import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

export type OnboardingReportArgs = DbUserContextArgs & {
  organizationId: OrganizationId;
};

export class OnboardingReport extends DbUserContext {
  readonly #organizationId: OrganizationId;

  private constructor({ organizationId, ...rest }: OnboardingReportArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: OnboardingReportArgs): OnboardingReport {
    return new this(args);
  }

  generate(): Promise<Result<Reports["Onboarding"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const anyOf = ({
          table,
          organizationId,
        }: {
          table: PgTable;
          organizationId: PgColumn;
        }): SQL =>
          exists(
            tx
              .select({ organizationId })
              .from(table)
              .where(eq(organizationId, this.#organizationId)),
          );

        const [result] = await tx
          .select({
            bankRelations: {
              exists: anyOf({
                table: DbSchema.Core.Bank.BankRelationsSchema,
                organizationId: DbSchema.Core.Bank.BankRelationsSchema.organizationId,
              }).mapWith(Boolean),
            },
            clients: {
              exists: anyOf({
                table: DbSchema.Billing.Clients.ClientsSchema,
                organizationId: DbSchema.Billing.Clients.ClientsSchema.organizationId,
              }).mapWith(Boolean),
            },
            invoices: {
              exists: anyOf({
                table: DbSchema.Billing.Invoices.InvoicesSchema,
                organizationId: DbSchema.Billing.Invoices.InvoicesSchema.organizationId,
              }).mapWith(Boolean),
            },
          })
          .from(DbSchema.Core.Organizations.OrganizationsSchema)
          .where(eq(DbSchema.Core.Organizations.OrganizationsSchema.id, this.#organizationId));

        return ReportsSchema.OnboardingSchema.OnboardingResultSchema.parse(
          result ?? {
            bankRelations: { exists: false },
            clients: { exists: false },
            invoices: { exists: false },
          },
        );
      });
    });
  }
}
