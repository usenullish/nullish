import type { RouteConfig } from "@hono/zod-openapi";
import type { App } from "../../types/app";
import type { DefineOpenAPIHandler, OpenAPIFormDataHandlerContext } from "../../types/openapi";
import { assertAuthSessionMiddleware } from "../../middlewares/auth";

type ResourceFactory = (args: { app: App }) => Resource;

export interface ResourceClass {
  create: ResourceFactory;
}

export function ResourceProvider(_constructor: ResourceClass) {}

type ResourcePaths = [`/${string}`, ...`/${string}`[]];

export interface ResourceArgs {
  paths: ResourcePaths;
  app: App;
}

export abstract class Resource {
  readonly #app: App;
  readonly #paths: ResourcePaths;

  protected constructor({ paths, app }: ResourceArgs) {
    this.#app = app;
    this.#paths = paths;
  }

  protected get app(): App {
    return this.#app;
  }

  get paths(): ResourcePaths {
    return this.#paths;
  }

  get routes(): string[] {
    return this.paths.map(this._toHonoPath);
  }

  // Resource path is written in OpenAPI-style {parentId} syntax
  protected _toHonoPath = (path: string): string => path.replace(/\{(\w+)}/g, ":$1");

  abstract register(): void;

  protected registerRoute<R extends RouteConfig>({
    route,
    handler,
  }: {
    route: R;
    handler: DefineOpenAPIHandler<R>;
  }): void {
    this.app.openapi(route, handler);
  }

  protected registerFormDataRoute<R extends RouteConfig>({
    route,
    handler,
  }: {
    route: R;
    handler: (context: OpenAPIFormDataHandlerContext<R>) => Promise<Response>;
  }): void {
    this.app.openapi(route, handler);
  }

  useAssertAuthSessionMiddleware(): void {
    this.routes
      .flatMap((route) => `${route}/*`)
      .forEach((route) => this.app.use(route, assertAuthSessionMiddleware));
  }

  useCustomMiddleware(): void {
    // Additional middlewares which can be used per routes (e.g. limiting the bank import file size)
  }
}
