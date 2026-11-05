import type { authClient } from "@usenullish/nullish-auth/client";

export type TwoFactorEnabled = NonNullable<
  Awaited<ReturnType<typeof authClient.twoFactor.enable>>["data"]
>;
