import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { PassThrough } from "node:stream";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import type { EntryContext, RouterContextProvider } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import { NonceContext } from "~/kit/csp/nonce.context";

export const streamTimeout = 5_000;

const sha256 = (value: string): string =>
  `'sha256-${createHash("sha256").update(value).digest("base64")}'`;

const SONNER_INSERT_CSS = /__insertCSS\(("(?:[^"\\]|\\.)*")\)/;

// Sonner injects its styles with an inline <style> that our CSP blocks, so we allow its hashes.
// https://github.com/emilkowalski/sonner/issues/449
const sonnerStyleHashes = (): string[] => {
  const source = readFileSync(createRequire(import.meta.url).resolve("sonner"), "utf8");
  const css = source.match(SONNER_INSERT_CSS)?.[1];

  return isNullish(css) ? [] : [sha256(""), sha256(String(JSON.parse(css)))];
};

const SONNER_STYLE_HASHES = sonnerStyleHashes().join(" ");

const setSecurityHeaders = ({ headers, nonce }: { headers: Headers; nonce: string }) => {
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}' ${SONNER_STYLE_HASHES}`,
      "img-src 'self'",
      "font-src 'self'",
      "connect-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  const nonce = import.meta.env.PROD ? randomBytes(16).toString("base64") : undefined;

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");

    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    );

    const { pipe, abort } = renderToPipeableStream(
      <NonceContext.Provider value={nonce}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </NonceContext.Provider>,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          if (nonNullish(nonce)) {
            setSecurityHeaders({ headers: responseHeaders, nonce });
          }

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;

          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
  });
}
