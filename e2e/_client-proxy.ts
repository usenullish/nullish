const API_URL = "http://localhost:3000";
const CLIENT_URL = "http://localhost:5174";

const API_PREFIX = "/api";

// In the CI we run the test in "preview" mode because vite dev
// fails are serving the app ("react router 504 (Outdated Optimize Dep)")
Bun.serve({
  port: 5173,
  fetch: async ({ url, method, headers, body }) => {
    const { pathname, search } = new URL(url);

    const target = pathname.startsWith(API_PREFIX)
      ? `${API_URL}${pathname.slice(API_PREFIX.length)}${search}`
      : `${CLIENT_URL}${pathname}${search}`;

    return await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
    });
  },
});
