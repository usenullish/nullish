import { createContext, type MiddlewareFunction } from "react-router";
import { type Nullable } from "@usenullish/nullish-common";
import type { Cookie } from "~/lib/schemas/cookie";
import { getAuthCookie } from "@usenullish/nullish-auth/client";

export const authCookieContext = createContext<Nullable<Cookie>>(undefined);

export const authCookieMiddleware: MiddlewareFunction = async ({ request, context }, next) => {
  context.set(authCookieContext, getAuthCookie({ request }));

  return next();
};
