import { type BetterAuthOptions, type Session, type User } from "better-auth";
import { DbMemberships } from "@usenullish/nullish-engine/core";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { CustomSession } from "../_types";

export const buildCustomSession = async ({
  db,
  session: { session, user },
}: {
  session: {
    user: User<BetterAuthOptions["user"], BetterAuthOptions["plugins"]>;
    session: Session<BetterAuthOptions["session"], BetterAuthOptions["plugins"]>;
  };
  db: PostgresDbInstance;
}): Promise<CustomSession> => {
  const roles = await DbMemberships.create({
    db,
    userId: session.userId,
  }).listAll();

  return {
    session,
    user: {
      ...user,
      ...(roles.status === "success" && {
        roles: roles.result.map(({ role, organizationId }) => ({
          role,
          organizationId,
        })),
      }),
    },
  };
};
