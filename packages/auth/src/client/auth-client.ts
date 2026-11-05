import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { customSession } from "better-auth/plugins";
import type { CustomSession } from "../_types";
import { twoFactorClient } from "better-auth/client/plugins";

type CustomSessionReturn = ReturnType<typeof customSession<CustomSession>>;

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    twoFactorClient(),
    customSessionClient<{ options: { plugins: [CustomSessionReturn] } }>(),
  ],
});
