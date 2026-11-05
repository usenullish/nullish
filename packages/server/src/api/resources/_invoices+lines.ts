import { DbCollectionLines, DbLines } from "@usenullish/nullish-engine/billing";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";
import { defineDeleteHandler } from "../handlers/root/delete";
import { BigIntCodec, nonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import { CrudResource } from "./_factories/crud-resource";
import { type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Records } from "@usenullish/nullish-schema/records";
import {
  definePostRoute,
  defineGetByIdRoute,
  defineListRoute,
  definePatchRoute,
  defineDeleteRoute,
} from "./_factories/crud-route-config";

const route = {
  spec: { tag: "Invoice Lines" },
} as const;

const childRoute = {
  ...route,
  path: "/billing/invoices/{parentId}/lines",
} as const;

const rootRoute = {
  ...route,
  path: "/billing/lines",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: { filters: { schema: ApiSchema.Lines.GetLinesFiltersQuerySchema } },
  },
  response: {
    body: { schema: ApiSchema.Lines.GetLinesResponseSchema },
    description: "Retrieve a list of invoice lines",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: {
      schema: ApiSchema.Lines.GetLineResponseSchema,
    },
    description: "Get an invoice line",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: {
      schema: ApiSchema.Lines.CreateLineRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.Lines.CreateLineResponseSchema,
    },
    description: "Create an invoice line",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: {
      schema: ApiSchema.Lines.UpdateLineRequestSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.Lines.UpdateLineResponseSchema,
    },
    description: "Update an invoice line",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a line of a draft invoice",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class LinesHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): LinesHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<
      ListRoute,
      Records["Billing"]["Lines"]["Select"],
      Records["Billing"]["Lines"]["Filter"]
    >({
      store: (args) => DbCollectionLines.create(args),
      resourceKey: "invoice-lines",
      filtersSchema: ApiSchema.Lines.GetLinesFiltersQuerySchema,
      build: ({ result: lines }) => ({
        lines: lines.map(this.#encodeLineResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Billing"]["Lines"]["Select"]>({
      store: (args) => DbLines.create(args),
      resourceKey: "invoice-line",
      build: ({ result: line }) => ({
        line: nonNullish(line) ? this.#encodeLineResponse(line) : line,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Billing"]["Lines"]["Select"]>({
      store: (args) => DbCollectionLines.create(args),
      resourceKey: "invoice-line",
      build: ({ result: line }) => ({
        line: this.#encodeLineResponse(line),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Billing"]["Lines"]["Select"],
      Records["Billing"]["Lines"]["Select"]["id"]
    >({
      store: (args) => DbLines.create(args),
      resourceKey: "invoice-line",
      build: ({ result: line }) => ({
        line: this.#encodeLineResponse(line),
      }),
      pKeySchema: ApiSchema.Lines.GetLinesRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Billing"]["Lines"]["Select"],
      Records["Billing"]["Lines"]["Select"]["id"]
    >({
      store: (args) => DbLines.create(args),
      resourceKey: "invoice-line",
      pKeySchema: ApiSchema.Lines.GetLinesRequestSchema.shape.id,
    }),
  };

  #encodeLineResponse = (line: Records["Billing"]["Lines"]["Select"]) => ({
    ...encodeAuditFieldsResponse(line),
    unitPrice: encodeWithCodecs({ schema: BigIntCodec, value: line.unitPrice }),
  });
}
