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
import { buildEmailAndPasswordConfig, type EmailAndPassword } from "./_email-and-password";

export const createAuth = ({
  db,
  env: { signUp, emailAndPassword, baseURL, secret },
}: {
  db: PostgresDbInstance;
  env: {
    signUp: boolean | "invite_only";
    // - In dev: no email verification and autoSignIn: true
    // - In prod: either
    //      a. email with verification + autoSignInAfterVerification: true
    //      b. autoSignIn false
    emailAndPassword: EmailAndPassword;
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
    ...buildEmailAndPasswordConfig({ emailAndPassword }),
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
