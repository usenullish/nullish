import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { DbCurrencies } from "@usenullish/nullish-engine/core";
import type { DbCollectionStore } from "@usenullish/nullish-engine";
import type { Records } from "@usenullish/nullish-schema/records";
import { defineListRoute } from "./_factories/crud-route-config";
import * as z from "zod";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const listRoute = defineListRoute({
  path: "/currencies",
  spec: { tag: "Currencies" },
  response: {
    body: { schema: ApiSchema.Currencies.GetCurrenciesResponseSchema },
    description: "Currencies",
  },
});

type ListRoute = typeof listRoute;

type SelectCurrencies = Records["Core"]["Currencies"]["Select"];

@ResourceProvider
export class CurrenciesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): CurrenciesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#defineList });
  }

  #defineList = withRest<ListRoute>(
    withPermission<ListRoute>(async ({ context, caller }) => {
      const {
        var: {
          db: { connection },
        },
        req,
      } = context;

      const parsedQuery = CommonSchema.Query.ListQuerySchema.safeParse(req.query());

      if (!parsedQuery.success) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const store: DbCollectionStore<SelectCurrencies, unknown, string> = DbCurrencies.create({
        db: connection,
        userId: caller.userId,
      });

      const result = await store.list(parsedQuery.data);

      if (result.status === "error") {
        if (result.err instanceof z.ZodError) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to get currencies",
          }),
        });
      }

      const build = (): Response200<ListRoute> => {
        return { currencies: result.result.map(encodeAuditFieldsResponse) };
      };

      return context.json(build(), 200);
    }),
  );
}
