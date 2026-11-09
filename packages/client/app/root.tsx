import {
  isRouteErrorResponse,
  Link,
  Links,
  type MiddlewareFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldRevalidateFunction,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import { authCookieMiddleware } from "~/context/middlewares/cookie";
import { OrganizationsServer } from "~/context/server/organizations.server";
import { OrganizationsContext } from "~/context/contexts/organizations.context";
import { CurrenciesServer } from "~/context/server/currencies.server";
import { CurrenciesContext } from "~/context/contexts/currencies.context";
import { UserReportsServer } from "~/context/server/user+reports.server";
import { UserAssistantServer } from "~/context/server/user+assistant.server";
import { LlmUsageContext } from "~/context/contexts/llm-usage.context";
import { AssistantContext } from "~/context/contexts/assistant.context";
import { SYSTEM_THEME_SCRIPT } from "~/kit/theme/theme.services";
import { ThemeProvider } from "~/kit/theme/theme-provider";
import { DEFAULT_KIT, initKit } from "~/kit/init";
import { I18nProvider } from "~/kit/i18n/i18n-provider";
import { NotificationsProvider } from "~/kit/notifications/notifications-provider";
import { PrivacyProvider } from "~/kit/privacy/privacy-provider";
import { ActiveConversationProvider } from "~/kit/chat/active-conversation-provider";
import { EnvironmentContext } from "~/kit/environment/environment.context";
import { useNonce } from "~/kit/csp/nonce.context";
import { notEmptyString } from "@usenullish/nullish-common";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/ui/components/card";
import { Button } from "~/ui/components/button";

// Server side middlewares
export const middleware: MiddlewareFunction[] = [authCookieMiddleware];

const TITLE = "nullish";
const DESCRIPTION = "Open-source Swiss accounting you can self-host. Al ready.";

const FALLBACK_DATA: Awaited<ReturnType<typeof loader>> = [
  undefined,
  undefined,
  DEFAULT_KIT,
  undefined,
  undefined,
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [_, __, kit] = useRouteLoaderData<typeof loader>("root") ?? FALLBACK_DATA;
  const { theme, i18n } = kit;
  const nonce = useNonce();

  // TODO: derive origin
  const socialImage = `https://app.nullish.ch/social-image.jpg`;

  return (
    <html
      lang={i18n.lang}
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning={theme === "system"}
    >
      <head>
        <title>{TITLE}</title>

        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <meta name="description" content={DESCRIPTION} />

        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={socialImage} />

        {theme === "system" && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }}
          />
        )}

        <Links />

        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const loader = async (args: Route.LoaderArgs) => {
  return await Promise.all([
    OrganizationsServer.create().listAllOrganizations(args),
    CurrenciesServer.create().listAll(args),
    initKit(args),
    UserReportsServer.create().getLlmUsage(args),
    UserAssistantServer.create().getAssistant(args),
  ]);
};

export const shouldRevalidate: ShouldRevalidateFunction = ({ currentUrl, nextUrl }) =>
  currentUrl.href === nextUrl.href;

export default function App({ loaderData }: Route.ComponentProps) {
  const [organizationsResult, currenciesResult, kit, llmUsageResult, assistantResult] =
    loaderData ?? [
      { organizations: undefined },
      { currencies: undefined },
      DEFAULT_KIT,
      undefined,
      undefined,
    ];

  const { theme, i18n, privacy, environment } = kit;

  return (
    <ThemeProvider initialTheme={theme}>
      <NotificationsProvider>
        <I18nProvider initialI18n={i18n}>
          <PrivacyProvider initialPrivacy={privacy}>
            <EnvironmentContext.Provider value={environment}>
              <ActiveConversationProvider>
                <OrganizationsContext.Provider value={organizationsResult?.organizations}>
                  <CurrenciesContext.Provider value={currenciesResult?.currencies}>
                    <LlmUsageContext.Provider value={llmUsageResult?.llmUsage}>
                      <AssistantContext.Provider value={assistantResult?.assistant}>
                        <Outlet />
                      </AssistantContext.Provider>
                    </LlmUsageContext.Provider>
                  </CurrenciesContext.Provider>
                </OrganizationsContext.Provider>
              </ActiveConversationProvider>
            </EnvironmentContext.Provider>
          </PrivacyProvider>
        </I18nProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}

// https://reactrouter.com/how-to/error-boundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const [, , { i18n }] = useRouteLoaderData<typeof loader>("root") ?? FALLBACK_DATA;

  let title = i18n.errors.label.shoot;
  let details = i18n.errors.text.unexpected;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? i18n.errors.label.oops : title;
    details =
      error.status === 404
        ? i18n.errors.text.not_found
        : typeof error.data === "string" && notEmptyString(error.data)
          ? error.data
          : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{details}</CardDescription>
        </CardHeader>

        {stack && (
          <CardContent>
            <pre className="max-h-64 overflow-auto text-[10px]">
              <code>{stack}</code>
            </pre>
          </CardContent>
        )}

        <CardContent>
          <Button className="w-full" nativeButton={false} render={<Link to="/" replace />}>
            {i18n.errors.action.back_home}
          </Button>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
}
