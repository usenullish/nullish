import { DbMemberships } from "@usenullish/nullish-engine/core";
import { DeleteUserService } from "@usenullish/nullish-admin/auth";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { APIError } from "better-auth/api";
import { AuthError } from "../_errors";

export const assertDeleteUserAllowed = async ({
  db,
  userId,
}: {
  db: PostgresDbInstance;
  userId: string;
}): Promise<void> => {
  await assertNoMemberships({ db, userId });
  await assertNoApiKeys({ db, userId });
};

const assertNoMemberships = async ({
  db,
  userId,
}: {
  db: PostgresDbInstance;
  userId: string;
}): Promise<void> => {
  const memberships = await DbMemberships.create({ db, userId }).listAll();

  if (memberships.status === "error") {
    throw memberships.err;
  }

  if (memberships.result.length > 0) {
    throw new APIError("FORBIDDEN", { message: AuthError.USER_HAS_ORGANIZATIONS });
  }
};

const assertNoApiKeys = async ({
  db,
  userId,
}: {
  db: PostgresDbInstance;
  userId: string;
}): Promise<void> => {
  const hasApiKeys = await DeleteUserService.create({ db }).hasApiKeys({ userId });

  if (hasApiKeys.status === "error") {
    throw hasApiKeys.err;
  }

  if (hasApiKeys.result) {
    throw new APIError("FORBIDDEN", { message: AuthError.USER_HAS_API_KEYS });
  }
};
