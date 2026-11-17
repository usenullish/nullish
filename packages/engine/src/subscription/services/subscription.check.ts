import { sql } from "drizzle-orm";
import * as z from "zod";
import { assertArrayExactlyOne, type Result, tryCatch } from "@usenullish/nullish-common";
import type { DbUserContextArgs } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../_service/service";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

const ValidSchema = z.strictObject({ valid: z.boolean() });

export class CheckSubscriptionService extends ServiceContext {
  private constructor(args: DbUserContextArgs) {
    super(args);
  }

  static create(args: DbUserContextArgs): CheckSubscriptionService {
    return new this(args);
  }

  isValid({ organizationId }: { organizationId: OrganizationId }): Promise<Result<boolean>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const rows = await tx.execute(
          sql`SELECT subscription.organization_subscription_is_valid(${organizationId}) AS valid`,
        );

        assertArrayExactlyOne(rows);

        const [row] = rows;

        return ValidSchema.parse(row).valid;
      });
    });
  }

  hasAnyValidSubscription(): Promise<Result<boolean>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const rows = await tx.execute(
          sql`SELECT EXISTS (
            SELECT 1 FROM core.memberships m
            WHERE m.user_id = auth.current_user_id()
              AND subscription.organization_subscription_is_valid(m.organization_id)
          ) AS valid`,
        );

        assertArrayExactlyOne(rows);

        const [row] = rows;

        return ValidSchema.parse(row).valid;
      });
    });
  }
}
