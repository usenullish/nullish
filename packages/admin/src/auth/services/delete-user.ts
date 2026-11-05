import { eq } from "drizzle-orm";
import type { Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";

const users = DbSchema.Auth.Auth.users;
const apikeys = DbSchema.Auth.Auth.apikeys;

type UserId = (typeof users.$inferSelect)["id"];

export class DeleteUserService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): DeleteUserService {
    return new this(args);
  }

  hasApiKeys({ userId }: { userId: UserId }): Promise<Result<boolean>> {
    return this._withDbContext(async (tx) => {
      const count = await tx.$count(apikeys, eq(apikeys.referenceId, userId));
      return count > 0;
    });
  }
}
