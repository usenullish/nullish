import { DbCollectionVatPeriods, DbVatPeriods } from "@usenullish/nullish-engine/core";
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
  spec: { tag: "VAT Periods" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/vat/periods",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/vat/periods",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.VatPeriods.GetVatPeriodsFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.VatPeriods.GetVatPeriodsResponseSchema },
    description: "Retrieve a list of VAT periods",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.VatPeriods.GetVatPeriodResponseSchema },
    description: "Get a VAT period",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.VatPeriods.CreateVatPeriodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatPeriods.CreateVatPeriodResponseSchema },
    description: "Create a VAT period",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.VatPeriods.UpdateVatPeriodRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatPeriods.UpdateVatPeriodResponseSchema },
    description: "Update a VAT period",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class VatPeriodsHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): VatPeriodsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Core"]["VatPeriods"]["Select"],
      Records["Core"]["VatPeriods"]["Filter"]
    >({
      store: (args) => DbCollectionVatPeriods.create(args),
      resourceKey: "vat+periods",
      filtersSchema: ApiSchema.VatPeriods.GetVatPeriodsFiltersQuerySchema,
      build: ({ result: periods }) => ({
        periods: periods.map(this.#encodeResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["VatPeriods"]["Select"]>({
      store: (args) => DbVatPeriods.create(args),
      resourceKey: "vat+period",
      build: ({ result: period }) => ({
        period: nonNullish(period) ? this.#encodeResponse(period) : period,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["VatPeriods"]["Select"]>({
      store: (args) => DbCollectionVatPeriods.create(args),
      resourceKey: "vat+period",
      build: ({ result: period }) => ({
        period: this.#encodeResponse(period),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["VatPeriods"]["Select"],
      Records["Core"]["VatPeriods"]["Select"]["id"]
    >({
      store: (args) => DbVatPeriods.create(args),
      resourceKey: "vat+period",
      build: ({ result: period }) => ({
        period: this.#encodeResponse(period),
      }),
      pKeySchema: ApiSchema.VatPeriods.GetVatPeriodsRequestSchema.shape.id,
    }),
  };

  #encodeResponse = (period: Records["Core"]["VatPeriods"]["Select"]) => ({
    ...encodeAuditFieldsResponse(period),
    startOn: encodeWithCodecs({ schema: DateCodec, value: period.startOn }),
    endOn: encodeWithCodecs({ schema: DateCodec, value: period.endOn }),
  });
}
