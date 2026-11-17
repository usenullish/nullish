import type { Result } from "@usenullish/nullish-common";
import { type Db, DbSchema, type QueryArgs } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore, DbCollectionStoreInitArgs } from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { EngineError } from "../../errors";

type SelectSubscriptions = Records["Subscription"]["Subscriptions"]["Select"];
type SubscriptionsSortField = DbRecordsSortField<Db["Subscription"]["Subscriptions"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionSubscriptions
  extends DbCollectionRecordsById<Db["Subscription"]["Subscriptions"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectSubscriptions, unknown, SubscriptionsSortField>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Subscription.Subscriptions.SubscriptionsSchema,
      foreignKeyColumn: DbSchema.Subscription.Subscriptions.SubscriptionsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionSubscriptions {
    return new this(args);
  }

  list(args: QueryArgs<SubscriptionsSortField>): Promise<Result<SelectSubscriptions[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
      ...args,
    });
  }

  async insert(_args: { values: unknown }): Promise<Result<SelectSubscriptions>> {
    return {
      status: "error",
      err: new EngineError("Subscriptions cannot be created."),
    };
  }
}
