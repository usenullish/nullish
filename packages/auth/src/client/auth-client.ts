import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { customSession } from "better-auth/plugins";
import type { CustomSession } from "../_types";
import { twoFactorClient } from "better-auth/client/plugins";
import { API_PATH } from "@usenullish/nullish-schema/server";
import { BASE_PATH } from "../_constants";

type CustomSessionReturn = ReturnType<typeof customSession<CustomSession>>;

export const authClient = createAuthClient({
  basePath: `${API_PATH}${BASE_PATH}`,
  plugins: [
    twoFactorClient(),
    customSessionClient<{ options: { plugins: [CustomSessionReturn] } }>(),
  ],
});
