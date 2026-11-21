import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import type { ApiOrganizationsWritableArgs } from "~/lib/api/_organizations";
import { ApiPaymentsManage } from "~/lib/api/payments+manage.api";
import { Service } from "./_services";

export class PaymentsManageService extends Service {
  private constructor() {
    super();
  }

  static create(): PaymentsManageService {
    return new this();
  }

  submit = async ({
    orgId,
  }: ApiOrganizationsWritableArgs): Promise<
    Result<Api["PaymentsManage"]["Client"]["ManagePaymentsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiPaymentsManage.create().submit({ orgId });
    });
  };
}
