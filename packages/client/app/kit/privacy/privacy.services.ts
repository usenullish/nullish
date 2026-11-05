import * as z from "zod";
import { createCookie, type LoaderFunctionArgs } from "react-router";

const PrivacySchema = z.strictObject({
  enabled: z.boolean().default(false),
});
export type Privacy = z.infer<typeof PrivacySchema>;

export const DEFAULT_NO_PRIVACY: Privacy = { enabled: false };

export const initPrivacy = async ({ request }: LoaderFunctionArgs): Promise<Privacy> => {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = await privacyCookie.parse(cookieHeader);

  const { success, data } = PrivacySchema.safeParse(cookie);
  return success ? data : DEFAULT_NO_PRIVACY;
};

const privacyCookie = createCookie("nullish-privacy", {
  maxAge: 31_536_000, // a year
  path: "/",
  sameSite: "lax",
  secure: import.meta.env.PROD,
});

export const savePrivacy = async ({ privacy }: { privacy: Privacy }) => {
  document.cookie = await privacyCookie.serialize(privacy);
};
