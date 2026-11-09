const API_URL = "http://localhost:3000";
const CLIENT_URL = "http://localhost:5174";

const API_PREFIX = "/api";

// In the CI we run the test in "preview" mode because vite dev
// fails are serving the app ("react router 504 (Outdated Optimize Dep)")
Bun.serve({
  port: 5173,
  fetch: async ({ url, method, headers, body }) => {
    const { pathname, search } = new URL(url);

    console.log(pathname);

    const target = pathname.startsWith(API_PREFIX)
      ? `${API_URL}${pathname.slice(API_PREFIX.length)}${search}`
      : `${CLIENT_URL}${pathname}${search}`;

    const forwarded = new Headers(headers);
    forwarded.delete("accept-encoding");

    const response = await fetch(target, {
      method,
      headers: forwarded,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);

    for (const header of [
      "connection",
      "content-encoding",
      "content-length",
      "transfer-encoding",
    ]) {
      responseHeaders.delete(header);
    }

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
});
