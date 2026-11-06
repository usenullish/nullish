import { parseCookies, SECURE_COOKIE_PREFIX } from "better-auth/cookies";
import { isNullish, nonNullish, notEmptyString, type Nullable } from "@usenullish/nullish-common";
import { COOKIE_NAME, COOKIE_PREFIX } from "../_constants";

export const getAuthCookie = ({ request: { headers } }: { request: Request }): Nullable<string> => {
  const SESSION_COOKIE = `${COOKIE_PREFIX}.${COOKIE_NAME}`;

  // We basically reimplement better-auth getSessionCookie because the library adds the __Secure- prefix when HTTPS is used,
  // i.e. the cookie gets a different name in production and development. Unfortunately, we cannot use secure cookies
  // in development (set `useSecureCookies: true` in the config), as e.g. Safari does not allow them over HTTP.
  // @see https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/cookies/index.ts#L563
  const cookies = headers.get("cookie");

  if (isNullish(cookies)) {
    return null;
  }

  const parsedCookie = parseCookies(cookies);

  const toAuthCookie = (name: string): Nullable<string> => {
    const value = parsedCookie.get(name);
    return notEmptyString(value) ? `${name}=${value}` : null;
  };

  // Similarly to better-auth, we first try the secure cookie and use it if defined.
  const secureCookie = toAuthCookie(`${SECURE_COOKIE_PREFIX}${SESSION_COOKIE}`);

  if (nonNullish(secureCookie)) {
    return secureCookie;
  }

  return toAuthCookie(SESSION_COOKIE);
};
