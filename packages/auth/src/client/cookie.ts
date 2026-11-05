import { getSessionCookie } from "better-auth/cookies";
import { COOKIE_NAME, COOKIE_PREFIX } from "../_constants";
import { notEmptyString } from "@usenullish/nullish-common";

export const getAuthCookie = ({ request }: { request: Request }) => {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: COOKIE_PREFIX,
    cookieName: COOKIE_NAME,
  });

  return notEmptyString(sessionCookie) ? `${COOKIE_PREFIX}.${COOKIE_NAME}=${sessionCookie}` : null;
};
