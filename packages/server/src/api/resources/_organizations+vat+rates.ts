import { DbCollectionVatRates, DbVatRates } from "@usenullish/nullish-engine/core";
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
  spec: { tag: "VAT Rates" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/accounting/vat/rates",
} as const;

const rootRoute = {
  ...route,
  path: "/accounting/vat/rates",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.VatRates.GetVatRatesFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.VatRates.GetVatRatesResponseSchema },
    description: "Retrieve a list of VAT rates",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.VatRates.GetVatRateResponseSchema },
    description: "Get a VAT rate",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.VatRates.CreateVatRateRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatRates.CreateVatRateResponseSchema },
    description: "Create a VAT rate",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.VatRates.UpdateVatRateRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatRates.UpdateVatRateResponseSchema },
    description: "Update a VAT rate",
  },
});

type UpdateRoute = typeof updateRoute;

@ResourceProvider
export class VatRatesHandlers extends RouteResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): VatRatesHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Core"]["VatRates"]["Select"],
      Records["Core"]["VatRates"]["Filter"]
    >({
      store: (args) => DbCollectionVatRates.create(args),
      resourceKey: "vat+rates",
      filtersSchema: ApiSchema.VatRates.GetVatRatesFiltersQuerySchema,
      build: ({ result: rates }) => ({
        rates: rates.map(this.#encodeResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["VatRates"]["Select"]>({
      store: (args) => DbVatRates.create(args),
      resourceKey: "vat+rate",
      build: ({ result: rate }) => ({
        rate: nonNullish(rate) ? this.#encodeResponse(rate) : rate,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["VatRates"]["Select"]>({
      store: (args) => DbCollectionVatRates.create(args),
      resourceKey: "vat+rate",
      build: ({ result: rate }) => ({
        rate: this.#encodeResponse(rate),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["VatRates"]["Select"],
      Records["Core"]["VatRates"]["Select"]["id"]
    >({
      store: (args) => DbVatRates.create(args),
      resourceKey: "vat+rate",
      build: ({ result: rate }) => ({
        rate: this.#encodeResponse(rate),
      }),
      pKeySchema: ApiSchema.VatRates.GetVatRatesRequestSchema.shape.id,
    }),
  };

  #encodeResponse = (rate: Records["Core"]["VatRates"]["Select"]) => ({
    ...encodeAuditFieldsResponse(rate),
    startOn: encodeWithCodecs({ schema: DateCodec, value: rate.startOn }),
    endOn: nonNullish(rate.endOn)
      ? encodeWithCodecs({ schema: DateCodec, value: rate.endOn })
      : null,
  });
}
