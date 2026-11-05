import { data, type LoaderFunctionArgs } from "react-router";
import {
  isEmptyString,
  isNullish,
  notEmptyString,
  type Option,
  type Result,
} from "@usenullish/nullish-common";
import type * as z from "zod";
import { authCookieContext } from "~/context/middlewares/cookie";
import type { Cookie } from "~/lib/schemas/cookie";
import { type Common, CommonSchema } from "@usenullish/nullish-schema/server";
import { QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";

// React Router single-fetch param naming the loaders to run
const ROUTER_PARAMS = ["_routes"];

export abstract class ServerLoader {
  readonly #context: string;

  protected constructor({ context }: { context: string }) {
    this.#context = context;
  }

  protected async _load<T>({
    args: { context },
    errorFallbackMsg,
    loaderFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsg: string;
    loaderFn: (params: { cookie: Cookie }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    const cookie = context.get(authCookieContext);

    if (isNullish(cookie)) {
      return undefined;
    }

    const result = await loaderFn({ cookie });

    if (result.status === "error") {
      console.error(`[${this.#context}]`, result.err);
      this.#error({
        status: 500,
        message: result.err instanceof Error ? result.err.message : errorFallbackMsg,
      });
    }

    return result.result;
  }

  protected async _loadWithId<T>({
    args,
    errorFallbackMsgs: { load: errorFallbackMsg, missingId: errorMissingId },
    loaderWithIdFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsgs: { load: string; missingId: string };
    loaderWithIdFn: (params: { cookie: Cookie; id: string }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    const { id } = args.params;

    if (isEmptyString(id)) {
      this.#error({ status: 404, message: errorMissingId });
    }

    const loaderFn = async (rest: { cookie: Cookie }) => await loaderWithIdFn({ id, ...rest });

    return await this._load({
      args,
      loaderFn,
      errorFallbackMsg,
    });
  }

  protected async _loadListWithId<T, TFilters = never>({
    args: { request, ...rest },
    errorFallbackMsgs,
    defaultSort,
    filtersSchema,
    loaderWithIdFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsgs: { load: string; missingId: string };
    defaultSort: Common["ListQuery"]["sort"];
    filtersSchema?: z.ZodType<TFilters>;
    loaderWithIdFn: (params: {
      cookie: Cookie;
      id: string;
      query: Common["ListQuery"];
      filters: Option<TFilters>;
    }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    return await this._loadWithId({
      args: { request, ...rest },
      errorFallbackMsgs,
      loaderWithIdFn: async (params) => {
        const filters = this.#parseFilters({ request, filtersSchema });

        if (filters.status === "error") {
          this.#error({ status: 400, message: "Invalid filters" });
        }

        return await loaderWithIdFn({
          ...params,
          query: this.#parseQuery({ request, defaultSort }),
          filters: filters.result,
        });
      },
    });
  }

  protected async _loadNested<T>({
    args,
    errorFallbackMsg,
    loaderWithOrgIdFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsg: string;
    loaderWithOrgIdFn: (params: { cookie: Cookie; orgId: string }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    const orgId = args.params["org-id"];

    // Layout guard redirect if no present
    if (isEmptyString(orgId)) {
      return undefined;
    }

    const loaderFn = async (rest: { cookie: Cookie }) =>
      await loaderWithOrgIdFn({ orgId, ...rest });

    return await this._load({
      args,
      loaderFn,
      errorFallbackMsg,
    });
  }

  protected async _loadListNested<T, TFilters = never>({
    args: { request, ...rest },
    errorFallbackMsg,
    defaultSort,
    filtersSchema,
    loaderWithOrgIdFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsg: string;
    defaultSort: Common["ListQuery"]["sort"];
    filtersSchema?: z.ZodType<TFilters>;
    loaderWithOrgIdFn: (params: {
      cookie: Cookie;
      orgId: string;
      query: Common["ListQuery"];
      filters: Option<TFilters>;
    }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    return await this._loadNested({
      args: { request, ...rest },
      errorFallbackMsg,
      loaderWithOrgIdFn: async (params) => {
        const filters = this.#parseFilters({ request, filtersSchema });

        if (filters.status === "error") {
          this.#error({ status: 400, message: "Invalid filters" });
        }

        return await loaderWithOrgIdFn({
          ...params,
          query: this.#parseQuery({ request, defaultSort }),
          filters: filters.result,
        });
      },
    });
  }

  protected async _loadNestedWithId<T>({
    args,
    errorFallbackMsgs: { load: errorFallbackMsg, missingId: errorMissingId },
    loaderWithIdsFn,
  }: {
    args: LoaderFunctionArgs;
    errorFallbackMsgs: { load: string; missingId: string };
    loaderWithIdsFn: (params: { cookie: Cookie; id: string }) => Promise<Result<T>>;
  }): Promise<Option<T>> {
    const orgId = args.params["org-id"];

    // Layout guard redirect if no present
    if (isEmptyString(orgId)) {
      return undefined;
    }

    const { id } = args.params;

    if (isEmptyString(id)) {
      this.#error({ status: 404, message: errorMissingId });
    }

    const loaderFn = async (rest: { cookie: Cookie }) => await loaderWithIdsFn({ id, ...rest });

    return await this._load({
      args,
      loaderFn,
      errorFallbackMsg,
    });
  }

  #parseQuery({
    request,
    defaultSort,
  }: {
    request: Request;
    defaultSort: Common["ListQuery"]["sort"];
  }): Common["ListQuery"] {
    const { searchParams } = URL.parse(request.url) ?? {
      searchParams: undefined,
    };

    return CommonSchema.Query.ListQuerySchema.parse({
      limit: searchParams?.get("limit") ?? QUERY_DEFAULT_PAGINATION,
      offset: searchParams?.get("offset") ?? 0,
      sort: searchParams?.get("sort") ?? defaultSort.field,
      direction: searchParams?.get("direction") ?? defaultSort.direction,
    });
  }

  #parseFilters<TFilters>({
    request,
    filtersSchema,
  }: {
    request: Request;
    filtersSchema: Option<z.ZodType<TFilters>>;
  }): Result<Option<TFilters>> {
    if (isNullish(filtersSchema)) {
      return { status: "success", result: undefined };
    }

    const { searchParams } = URL.parse(request.url) ?? { searchParams: undefined };

    const params = Object.fromEntries(
      [...(searchParams?.entries() ?? [])].filter(
        ([key, value]) =>
          !ROUTER_PARAMS.includes(key) &&
          !CommonSchema.Query.ListQueryParamsSchema.keyof().validate(key) &&
          notEmptyString(value),
      ),
    );

    const { success, data, error } = filtersSchema.safeParse(params);

    return success ? { status: "success", result: data } : { status: "error", err: error };
  }

  #error({ status, message }: { status: number; message: string }): never {
    throw data(message, { status });
  }
}
