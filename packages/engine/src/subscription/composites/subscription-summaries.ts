import { DbUserContext } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { parseQueryArgs } from "../../_query/helpers";
import { listSubscriptionSummaries } from "../_helpers/subscription-summaries";

type SubscriptionSummary = Composites["SubscriptionSummaries"]["Select"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

export class DbCollectionSubscriptionSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(subscriptions)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionSubscriptionSummaries {
    return new this(args);
  }

  list({ pagination, sort }: DbListArgs<string>): Promise<Result<SubscriptionSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: subscriptions,
        pKey: subscriptions.id,
      });

      return await this._withAuth<SubscriptionSummary[]>(
        async (tx) =>
          await listSubscriptionSummaries({
            tx,
            organizationId: this.#organizationId,
            ...queryArgs,
          }),
      );
    });
  }
}
