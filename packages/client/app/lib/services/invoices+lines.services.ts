import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiInvoicesLinesSsr } from "~/lib/api/invoices+lines.ssr.api";
import type { ApiInvoicesGetByIdArgs } from "~/lib/api/_invoices";
import { ApiLines } from "~/lib/api/invoices+lines.api";
import { Service } from "./_services";

export class LinesService extends Service {
  private constructor() {
    super();
  }

  static create(): LinesService {
    return new this();
  }

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiInvoicesGetByIdArgs &
    ApiListArgs<Api["InvoicesLines"]["Client"]["GetLinesFilters"]>): Promise<
    Result<Api["InvoicesLines"]["Client"]["GetLinesResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiInvoicesLinesSsr.create({ cookie }).list(rest);
    });
  };

  submit = async ({
    invoiceId,
    line,
  }: {
    invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
    line: Api["InvoicesLines"]["Client"]["CreateLineBody"];
  }): Promise<Result<Api["InvoicesLines"]["Client"]["CreateLineResponse"]>> => {
    try {
      const result = await ApiLines.create().submit({
        body: line,
        invoiceId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  delete = async ({
    lineId,
  }: {
    lineId: NonNullable<Api["InvoicesLines"]["Client"]["GetLineResponse"]["line"]>["id"];
  }): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiLines.create().delete({ lineId });
    });
  };
}
