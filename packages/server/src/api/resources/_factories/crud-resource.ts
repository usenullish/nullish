import { Resource, type ResourceArgs } from "./resource";
import type { RouteConfig } from "@hono/zod-openapi";
import type { DefineOpenAPIHandler } from "../../types/openapi";

export type RouteConfigs = {
  list: RouteConfig;
  getById: RouteConfig;
  create: RouteConfig;
  update: RouteConfig;
};

export abstract class RouteResource<Routes extends RouteConfigs = RouteConfigs> extends Resource {
  protected constructor(args: ResourceArgs) {
    super(args);
  }

  protected abstract readonly defineList: {
    route: Routes["list"];
    handler: DefineOpenAPIHandler<Routes["list"]>;
  };

  protected abstract readonly defineGetById: {
    route: Routes["getById"];
    handler: DefineOpenAPIHandler<Routes["getById"]>;
  };

  protected abstract readonly defineCreate: {
    route: Routes["create"];
    handler: DefineOpenAPIHandler<Routes["create"]>;
  };

  protected abstract readonly defineUpdate: {
    route: Routes["update"];
    handler: DefineOpenAPIHandler<Routes["update"]>;
  };

  override register(): void {
    this.app.openapi(this.defineList.route, this.defineList.handler);
    this.app.openapi(this.defineGetById.route, this.defineGetById.handler);
    this.app.openapi(this.defineCreate.route, this.defineCreate.handler);
    this.app.openapi(this.defineUpdate.route, this.defineUpdate.handler);
  }
}

export type CrudRouteConfigs = RouteConfigs & {
  delete: RouteConfig;
};

export abstract class CrudResource<
  Routes extends CrudRouteConfigs = CrudRouteConfigs,
> extends RouteResource<Routes> {
  protected abstract readonly defineDelete: {
    route: Routes["delete"];
    handler: DefineOpenAPIHandler<Routes["delete"]>;
  };

  override register(): void {
    super.register();

    this.app.openapi(this.defineDelete.route, this.defineDelete.handler);
  }
}
