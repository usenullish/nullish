import { DbCollectionVatMethodSummaries } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeVatMethodSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type SelectVatMethodSummaries = Composites["VatMethodSummaries"]["Select"];

const listRoute = defineListRoute({
  spec: { tag: "VAT Methods" },
  path: "/organizations/{parentId}/accounting/vat/method-summaries",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.VatMethodSummaries.GetVatMethodSummariesResponseSchema },
    description:
      "Retrieve a list of VAT methods with their period, sorted by the columns of the period",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class VatMethodSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): VatMethodSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, SelectVatMethodSummaries>({
    query: async ({ db, userId, context, pagination, sort }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionVatMethodSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort });
    },
    resourceKey: "vatMethodSummaries",
    build: ({ result: vatMethodSummaries }) => ({
      vatMethodSummaries: vatMethodSummaries.map(encodeVatMethodSummaryResponse),
    }),
  });
}
