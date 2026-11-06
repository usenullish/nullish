import { describe, expect, test } from "bun:test";
import { getAuthCookie } from "../../src/client/cookie";

const SESSION_COOKIE = "nullish-auth.session_token";
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

const requestWithCookie = (cookie?: string): Request =>
  new Request("http://localhost/", cookie === undefined ? {} : { headers: { cookie } });

describe("getAuthCookie", () => {
  test("returns the session cookie under its plain name over HTTP", () => {
    const request = requestWithCookie(`${SESSION_COOKIE}=token`);

    expect(getAuthCookie({ request })).toBe(`${SESSION_COOKIE}=token`);
  });

  test("returns the session cookie under its __Secure- name over HTTPS", () => {
    const request = requestWithCookie(`${SECURE_SESSION_COOKIE}=token`);

    expect(getAuthCookie({ request })).toBe(`${SECURE_SESSION_COOKIE}=token`);
  });

  test("prefers the __Secure- cookie over a non-secure leftover", () => {
    const request = requestWithCookie(`${SESSION_COOKIE}=leftover; ${SECURE_SESSION_COOKIE}=token`);

    expect(getAuthCookie({ request })).toBe(`${SECURE_SESSION_COOKIE}=token`);
  });

  test("returns only the session cookie among other cookies", () => {
    const request = requestWithCookie(`theme=dark; ${SECURE_SESSION_COOKIE}=token; lang=fr`);

    expect(getAuthCookie({ request })).toBe(`${SECURE_SESSION_COOKIE}=token`);
  });

  test("falls back to the plain cookie when the __Secure- one is empty", () => {
    const request = requestWithCookie(`${SECURE_SESSION_COOKIE}=; ${SESSION_COOKIE}=token`);

    expect(getAuthCookie({ request })).toBe(`${SESSION_COOKIE}=token`);
  });

  test("returns null without a session cookie", () => {
    const request = requestWithCookie("theme=dark; lang=fr");

    expect(getAuthCookie({ request })).toBeNull();
  });

  test("returns null without a cookie header", () => {
    expect(getAuthCookie({ request: requestWithCookie() })).toBeNull();
  });

  test("returns null when the session cookie is empty", () => {
    const request = requestWithCookie(`${SESSION_COOKIE}=`);

    expect(getAuthCookie({ request })).toBeNull();
  });
});
