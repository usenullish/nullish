import { DbCollectionPeriods, DbPeriods } from "@usenullish/nullish-engine/ledger";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { DateCodec, nonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import { RouteResource } from "./_factories/crud-resource";
import { type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  definePostRoute,
  defineGetByIdRoute,
  defineListRoute,
  definePatchRoute,
} from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";

const route = {
  spec: { tag: "Periods" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/periods",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/periods",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Periods.GetPeriodsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Periods.GetPeriodsResponseSchema },
    description: "Retrieve a list of periods",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Periods.GetPeriodResponseSchema },
    description: "Get a period",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Periods.CreatePeriodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Periods.CreatePeriodResponseSchema },
    description: "Create a period",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.Periods.UpdatePeriodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Periods.UpdatePeriodResponseSchema },
    description: "Update a period",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class PeriodsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): PeriodsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Ledger"]["Periods"]["Select"],
      Records["Ledger"]["Periods"]["Filter"]
    >({
      store: (args) => DbCollectionPeriods.create(args),
      resourceKey: "periods",
      filtersSchema: ApiSchema.Periods.GetPeriodsFiltersQuerySchema,
      build: ({ result: periods }) => ({
        periods: periods.map(this.#encodeResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Ledger"]["Periods"]["Select"]>({
      store: (args) => DbPeriods.create(args),
      resourceKey: "period",
      build: ({ result: period }) => ({
        period: nonNullish(period) ? this.#encodeResponse(period) : period,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Ledger"]["Periods"]["Select"]>({
      store: (args) => DbCollectionPeriods.create(args),
      resourceKey: "period",
      build: ({ result: period }) => ({
        period: this.#encodeResponse(period),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Ledger"]["Periods"]["Select"],
      Records["Ledger"]["Periods"]["Select"]["id"]
    >({
      store: (args) => DbPeriods.create(args),
      resourceKey: "period",
      build: ({ result: period }) => ({
        period: this.#encodeResponse(period),
      }),
      pKeySchema: ApiSchema.Periods.GetPeriodsRequestSchema.shape.id,
    }),
  };

  #encodeResponse = (period: Records["Ledger"]["Periods"]["Select"]) => ({
    ...encodeAuditFieldsResponse(period),
    startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
    endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
  });
}
