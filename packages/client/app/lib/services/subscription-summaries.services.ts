import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiSubscriptionSummariesSsr } from "~/lib/api/subscription-summaries.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class SubscriptionSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): SubscriptionSummariesService {
    return new this();
  }

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["SubscriptionSummaries"]["Client"]["GetSubscriptionSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiSubscriptionSummariesSsr.create({ cookie });

      const subscriptionSummaries = await this._listAll({
        listFn: async (query) => {
          const { data: subscriptionSummaries } = await api.list({ orgId, query });
          return subscriptionSummaries;
        },
      });

      return { data: subscriptionSummaries };
    });
  };
}
