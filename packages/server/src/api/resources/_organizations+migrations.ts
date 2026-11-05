import { DbCollectionMigrations, DbMigrations } from "@usenullish/nullish-engine/migration";
import {
  ApiSchema,
  CommonSchema,
  encodeAuditFieldsResponse,
} from "@usenullish/nullish-schema/server";
import type { Records } from "@usenullish/nullish-schema/records";
import { nonNullish } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import {
  defineDeleteRoute,
  defineGetByIdRoute,
  defineListRoute,
  definePostRoute,
} from "./_factories/crud-route-config";
import { defineChildListHandler } from "../handlers/child/list";
import { defineChildCreateHandler } from "../handlers/child/create";
import { _defineGetByIdHandler } from "../handlers/_get-by-id";
import { defineDeleteHandler } from "../handlers/root/delete";

type Migration = Records["Migration"]["Migrations"]["Select"];

const route = {
  spec: { tag: "Migrations" },
} as const;

const childRoute = {
  ...route,
  path: "/organizations/{parentId}/migrations",
} as const;

const rootRoute = {
  ...route,
  path: "/migrations",
} as const;

const listRoute = defineListRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.Migrations.GetMigrationsResponseSchema },
    description: "Retrieve the migrations of an organization",
  },
});

type ListRoute = typeof listRoute;

const getByIdRoute = defineGetByIdRoute({
  ...rootRoute,
  response: {
    body: { schema: ApiSchema.Migrations.GetMigrationResponseSchema },
    description: "Get a migration",
  },
});

type GetByIdRoute = typeof getByIdRoute;

const createRoute = definePostRoute({
  ...childRoute,
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.Migrations.CreateMigrationRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.Migrations.CreateMigrationResponseSchema },
    description: "Create a draft migration",
  },
});

type CreateRoute = typeof createRoute;

const deleteRoute = defineDeleteRoute({
  ...rootRoute,
  response: {
    description: "Delete a draft migration and its datasets",
  },
});

type DeleteRoute = typeof deleteRoute;

@ResourceProvider
export class MigrationsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [rootRoute.path, childRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MigrationsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: getByIdRoute, handler: this.#getById });
    this.registerRoute({ route: createRoute, handler: this.#create });
    this.registerRoute({ route: deleteRoute, handler: this.#delete });
  }

  readonly #list = defineChildListHandler<ListRoute, Migration>({
    store: (args) => DbCollectionMigrations.create(args),
    resourceKey: "migrations",
    build: ({ result: migrations }) => ({
      migrations: migrations.map(encodeAuditFieldsResponse),
    }),
  });

  readonly #getById = _defineGetByIdHandler<GetByIdRoute, Migration>({
    query: async ({ db, userId, id }) =>
      await DbMigrations.create({ db, userId }).find({ pKey: id }),
    resourceKey: "migration",
    build: ({ result: migration }) => ({
      migration: nonNullish(migration) ? encodeAuditFieldsResponse(migration) : migration,
    }),
  });

  readonly #create = defineChildCreateHandler<CreateRoute, Migration>({
    store: (args) => DbCollectionMigrations.create(args),
    resourceKey: "migration",
    build: ({ result: migration }) => ({
      migration: encodeAuditFieldsResponse(migration),
    }),
  });

  readonly #delete = defineDeleteHandler<DeleteRoute, Migration, Migration["id"]>({
    store: (args) => DbMigrations.create(args),
    resourceKey: "migration",
    pKeySchema: ApiSchema.Migrations.MigrationSchema.shape.id,
  });
}
