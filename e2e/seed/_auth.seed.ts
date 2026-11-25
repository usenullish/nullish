import { createAuth } from "../../packages/auth/src/server";
import { envAuthSecret, envAuthUrl } from "../../packages/env/src";
import type { PostgresDbInstance } from "../../packages/schema/src/db";
import type { Records } from "../../packages/schema/src/records";

type User = Records["Auth"]["Users"]["Select"];

export const signUpE2EUser = async ({
  db,
  user: { name, email, password },
}: {
  db: PostgresDbInstance;
  user: Pick<User, "name" | "email"> & { password: string };
}): Promise<User["id"]> => {
  const { user } = await createAuth({
    db,
    env: {
      signUp: true,
      emailAndPassword: { autoSignIn: true },
      baseURL: envAuthUrl(),
      secret: envAuthSecret(),
    },
  }).api.signUpEmail({ body: { name, email, password } });

  return user.id;
};
