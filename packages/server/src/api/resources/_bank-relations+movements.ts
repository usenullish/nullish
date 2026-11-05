import { DbCollectionMovements, DbMovements } from "@usenullish/nullish-engine/banking";
import {
  ApiSchema,
  CommonSchema,
  encodeBankMovementResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetByIdRoute, defineListRoute } from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { _defineGetByIdHandler } from "../handlers/_get-by-id";

type SelectMovements = Records["Banking"]["Movements"]["Select"];
type FilterMovements = Records["Banking"]["Movements"]["Filter"];

const route = {
  spec: { tag: "Bank movements" },
} as const;

const childRoute = {
  ...route,
  path: "/banking/relations/{parentId}/movements",
} as const;

const rootRoute = {
  ...route,
  path: "/banking/movements",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: ApiSchema.BankMovements.GetBankMovementsFiltersQuerySchema },
    },
  },
  response: {
    body: { schema: ApiSchema.BankMovements.GetBankMovementsResponseSchema },
    description: "Retrieve the movements of a bank relation",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.BankMovements.GetBankMovementResponseSchema },
    description: "Get a bank movement",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class BankMovementsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankMovementsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: getByIdRoute, handler: this.#getById });
  }

  readonly #list = defineChildListHandler<ListRoute, SelectMovements, FilterMovements>({
    store: (args) => DbCollectionMovements.create(args),
    resourceKey: "bankMovements",
    filtersSchema: ApiSchema.BankMovements.GetBankMovementsFiltersQuerySchema,
    build: ({ result: bankMovements }) => ({
      bankMovements: bankMovements.map(encodeBankMovementResponse),
    }),
  });

  readonly #getById = _defineGetByIdHandler<GetByIdRoute, SelectMovements>({
    query: async ({ db, userId, id }) =>
      await DbMovements.create({ db, userId }).find({ pKey: id }),
    resourceKey: "bankMovement",
    build: ({ result: bankMovement }) => ({
      bankMovement: nonNullish(bankMovement)
        ? encodeBankMovementResponse(bankMovement)
        : bankMovement,
    }),
  });
}
