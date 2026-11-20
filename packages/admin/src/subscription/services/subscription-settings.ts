import { assertArrayAtMostOne, type Option, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { selectMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { updateSubscriptionSettings } from "../_helpers/subscription-settings";

const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

type SubscriptionSettings = Records["Subscription"]["SubscriptionSettings"]["Select"];

export class SubscriptionSettingsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): SubscriptionSettingsService {
    return new this(args);
  }

  get(): Promise<Result<Option<SubscriptionSettings>>> {
    return this._withDbContext(async (tx) => {
      const rows = await selectMany({
        tx,
        table: subscriptionSettings,
        schema:
          RecordsSchema.Subscription.SubscriptionSettingsSchema.SelectSubscriptionSettingsSchema,
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }

  update({
    settings,
  }: {
    settings: Records["Subscription"]["SubscriptionSettings"]["Update"];
  }): Promise<Result<Option<SubscriptionSettings>>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Subscription.SubscriptionSettingsSchema.UpdateSubscriptionSettingsSchema.parse(
          settings,
        );

      return await updateSubscriptionSettings({ tx, settings: values });
    });
  }
}
