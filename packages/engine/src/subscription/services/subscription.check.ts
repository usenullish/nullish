import { sql } from "drizzle-orm";
import * as z from "zod";
import {
  assertArrayExactlyOne,
  isNullish,
  type Nullable,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import type { DbUserContextArgs, Tx } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../_service/service";
import { EngineError } from "../../errors";

type OrganizationId = Records["Core"]["Organizations"]["Select"]["id"];

const ValidSchema = z.strictObject({ valid: z.boolean() });

export class CheckSubscriptionService extends ServiceContext {
  private constructor(args: DbUserContextArgs) {
    super(args);
  }

  static create(args: DbUserContextArgs): CheckSubscriptionService {
    return new this(args);
  }

  assertValid({
    organizationId,
  }: {
    organizationId: Nullable<OrganizationId>;
  }): Promise<Result<void>> {
    return tryCatch(async () => {
      await this._withAuth(async (tx) => {
        if (isNullish(organizationId)) {
          await this.#assertAnyValid({ tx });
          return;
        }

        await this.#assertOrganizationValid({ tx, organizationId });
      });
    });
  }

  async #assertOrganizationValid({
    tx,
    organizationId,
  }: {
    tx: Tx;
    organizationId: OrganizationId;
  }): Promise<void> {
    const valid = await this.#queryValid({
      tx,
      query: sql`SELECT subscription.organization_subscription_is_valid(${organizationId}) AS valid`,
    });

    if (!valid) {
      throw new EngineError("The subscription of this organization is not valid.");
    }
  }

  async #assertAnyValid({ tx }: { tx: Tx }): Promise<void> {
    const valid = await this.#queryValid({
      tx,
      query: sql`SELECT EXISTS (
        SELECT 1 FROM core.memberships m
        WHERE m.user_id = auth.current_user_id()
          AND subscription.organization_subscription_is_valid(m.organization_id)
      ) AS valid`,
    });

    if (!valid) {
      throw new EngineError("None of the organizations has a valid subscription.");
    }
  }

  async #queryValid({ tx, query }: { tx: Tx; query: ReturnType<typeof sql> }): Promise<boolean> {
    const rows = await tx.execute(query);

    assertArrayExactlyOne(rows);

    const [row] = rows;

    return ValidSchema.parse(row).valid;
  }
}
