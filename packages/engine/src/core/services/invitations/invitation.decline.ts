import { sql } from "drizzle-orm";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { InvitationService, type InvitationServiceArgs } from "./_invitation";

export class DeclineInvitationService extends InvitationService {
  private constructor(args: InvitationServiceArgs) {
    super(args);
  }

  static create(args: InvitationServiceArgs): DeclineInvitationService {
    return new this(args);
  }

  decline(): Promise<Result<void>> {
    return tryCatch(async () => {
      await this._withAuth(async (tx) => {
        await tx.execute(sql`SELECT core.decline_invitation(${this._token})`);
      });
    });
  }
}
