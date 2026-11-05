import { DbCollectionBankRelations, DbBankRelations } from "@usenullish/nullish-engine/core";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import { nonNullish } from "@usenullish/nullish-common";
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
import { defineChildListHandler } from "../handlers/child/list";
import { defineGetByIdHandler } from "../handlers/root/get-by-id";
import { defineChildCreateHandler } from "../handlers/child/create";
import { defineUpdateHandler } from "../handlers/root/update";
import { defineDeleteHandler } from "../handlers/root/delete";

const route = {
  spec: { tag: "Bank Accounts" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/banking/relations",
} as const;

const rootRoute = {
  ...route,
  path: "/banking/relations",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.BankRelations.GetBankRelationsResponseSchema },
    description: "Retrieve a list of bank relations",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.BankRelations.GetBankRelationResponseSchema },
    description: "Get a bank relation",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.BankRelations.CreateBankRelationRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.BankRelations.CreateBankRelationResponseSchema },
    description: "Create a bank relation",
  },
});

type CreateRoute = typeof createRoute;

const updateRoute = definePatchRoute({
  ...rootRoute,
  request: {
    body: { schema: ApiSchema.BankRelations.UpdateBankRelationRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.BankRelations.UpdateBankRelationResponseSchema },
    description: "Update a bank relation",
  },
});

type UpdateRoute = typeof updateRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a bank relation",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class BankRelationsHandlers extends CrudResource<{
  list: ListRoute;
  getById: GetByIdRoute;
  create: CreateRoute;
  update: UpdateRoute;
  delete: DeleteRoute;
}> {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): BankRelationsHandlers {
    return new this(args);
  }

  protected override readonly defineList = {
    route: listRoute,
    handler: defineChildListHandler<ListRoute, Records["Core"]["BankRelations"]["Select"]>({
      store: (args) => DbCollectionBankRelations.create(args),
      resourceKey: "bank-relations",
      build: ({ result: bankRelations }) => ({
        bankRelations: bankRelations.map(this.#encodeResponse),
      }),
    }),
  };

  protected override readonly defineGetById = {
    route: getByIdRoute,
    handler: defineGetByIdHandler<GetByIdRoute, Records["Core"]["BankRelations"]["Select"]>({
      store: (args) => DbBankRelations.create(args),
      resourceKey: "bank-relation",
      build: ({ result: bankRelation }) => ({
        bankRelation: nonNullish(bankRelation) ? this.#encodeResponse(bankRelation) : bankRelation,
      }),
    }),
  };

  protected override readonly defineCreate = {
    route: createRoute,
    handler: defineChildCreateHandler<CreateRoute, Records["Core"]["BankRelations"]["Select"]>({
      store: (args) => DbCollectionBankRelations.create(args),
      resourceKey: "bank-relation",
      build: ({ result: bankRelation }) => ({
        bankRelation: this.#encodeResponse(bankRelation),
      }),
    }),
  };

  protected override readonly defineUpdate = {
    route: updateRoute,
    handler: defineUpdateHandler<
      UpdateRoute,
      Records["Core"]["BankRelations"]["Select"],
      Records["Core"]["BankRelations"]["Select"]["id"]
    >({
      store: (args) => DbBankRelations.create(args),
      resourceKey: "bank-relation",
      build: ({ result: bankRelation }) => ({
        bankRelation: this.#encodeResponse(bankRelation),
      }),
      pKeySchema: ApiSchema.BankRelations.GetBankRelationsRequestSchema.shape.id,
    }),
  };

  protected override readonly defineDelete = {
    route: deleteRoute,
    handler: defineDeleteHandler<
      DeleteRoute,
      Records["Core"]["BankRelations"]["Select"],
      Records["Core"]["BankRelations"]["Select"]["id"]
    >({
      store: (args) => DbBankRelations.create(args),
      resourceKey: "bank-relation",
      pKeySchema: ApiSchema.BankRelations.GetBankRelationsRequestSchema.shape.id,
    }),
  };

  #encodeResponse = (bankRelation: Records["Core"]["BankRelations"]["Select"]) =>
    encodeAuditFieldsResponse(bankRelation);
}
