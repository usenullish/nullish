import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiSubscriptionsSsr } from "~/lib/api/subscriptions.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class SubscriptionsService extends Service {
  private constructor() {
    super();
  }

  static create(): SubscriptionsService {
    return new this();
  }

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["Subscriptions"]["Client"]["GetSubscriptionsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiSubscriptionsSsr.create({ cookie });

      const subscriptions = await this._listAll({
        listFn: async (query) => {
          const { subscriptions } = await api.list({ orgId, query });
          return subscriptions;
        },
      });

      return { subscriptions };
    });
  };
}
