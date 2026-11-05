import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { customSession } from "better-auth/plugins";
import {
  COOKIE_PREFIX,
  BASE_PATH,
  API_KEY_CONFIG,
  SESSION,
  INVITATION_TOKEN_HEADER,
  TWO_FACTOR_CONFIG,
} from "../_constants";
import { apiKey } from "@better-auth/api-key";
import { assertSignUpAllowed } from "./_sign-up";
import { buildCustomSession } from "./_custom-session";
import { assertDeleteUserAllowed } from "./_delete-user";
import { twoFactor } from "better-auth/plugins";

export const createAuth = ({
  db,
  env: { signUp, autoSignIn, baseURL, secret },
}: {
  db: PostgresDbInstance;
  env: {
    signUp: boolean | "invite_only";
    // TODO: to be enhanced once we enable email verification
    // i.e.
    // - In dev: no email verification and autoSignIn: true
    // - In prod: either
    //      a. email verification + autoSignInAfterVerification: true
    //      b. autoSignIn false
    // Note: not enabling email verification and autoSignIn set to true leads to a minor
    // privacy leak - one can try to sign-up with an existing email and get to know if already used
    // or not.
    autoSignIn: boolean;
    baseURL: string;
    secret: string;
  };
}) =>
  betterAuth({
    baseURL,
    secret,
    basePath: BASE_PATH,
    session: SESSION,
    advanced: {
      cookiePrefix: COOKIE_PREFIX,
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
      schema: DbSchema.Auth.Auth,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn,
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async ({ id }) => {
          await assertDeleteUserAllowed({ db, userId: id });
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async ({ email }, context) => {
            await assertSignUpAllowed({
              db,
              signUp,
              email,
              invitationToken: context?.headers?.get(INVITATION_TOKEN_HEADER),
            });
          },
        },
      },
    },
    plugins: [
      twoFactor(TWO_FACTOR_CONFIG),
      apiKey(API_KEY_CONFIG),
      customSession(async (session) => {
        return await buildCustomSession({ session, db });
      }),
    ],
  });

export type Auth = ReturnType<typeof createAuth>;
