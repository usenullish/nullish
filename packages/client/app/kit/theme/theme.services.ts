import * as z from "zod";
import { createCookie, type LoaderFunctionArgs } from "react-router";

const ThemeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof ThemeSchema>;

const themeCookie = createCookie("nullish-theme", {
  maxAge: 31_536_000, // a year
  path: "/",
  sameSite: "lax",
  secure: import.meta.env.PROD,
});

const DARK_QUERY = "(prefers-color-scheme: dark)";

export const initTheme = async ({ request }: LoaderFunctionArgs): Promise<Theme> => {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = await themeCookie.parse(cookieHeader);

  const { success, data } = ThemeSchema.safeParse(cookie);
  return success ? data : "system";
};

export const applyTheme = ({ theme }: { theme: Theme }) => {
  const dark = theme === "dark" || (theme === "system" && matchMedia(DARK_QUERY).matches);

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
};

export const saveTheme = async ({ theme }: { theme: Theme }) => {
  document.cookie = await themeCookie.serialize(theme);
};

export const watchSystemTheme = (): (() => void) => {
  const query = matchMedia(DARK_QUERY);
  const onChange = () => applyTheme({ theme: "system" });

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};

// On the first visit, or as long as the user hasn't chosen a theme, the server - which renders the
// theme from a cookie - cannot know whether the system theme is dark or light. Therefore, we apply
// the system theme as soon as possible, before the first paint.
export const SYSTEM_THEME_SCRIPT = `(() => {
  const dark = matchMedia("${DARK_QUERY}").matches;

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();`;
