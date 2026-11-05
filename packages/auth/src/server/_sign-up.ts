import { SignUpService } from "@usenullish/nullish-admin/auth";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { APIError } from "better-auth/api";
import { AuthError } from "../_errors";

const InvitationTokenSchema = ApiSchema.Invitations.InvitationTokenRequestSchema.shape.token;

export const assertSignUpAllowed = async ({
  db,
  signUp,
  email,
  invitationToken,
}: {
  db: PostgresDbInstance;
  signUp: boolean | "invite_only";
  email: string;
  invitationToken: unknown;
}): Promise<void> => {
  // Sign-up is allowed for any users
  if (signUp === true) {
    return;
  }

  const service = SignUpService.create({ db });

  // If sign-up is disallowed or requires invitation, we still allow one user sign-up
  // "Self-hosted: first user wins"
  const hasUsers = await service.hasUsers();

  if (hasUsers.status === "error") {
    throw hasUsers.err;
  }

  if (!hasUsers.result) {
    return;
  }

  // There is a user and additional registration is disallowed.
  if (signUp === false) {
    throw new APIError("FORBIDDEN", { message: AuthError.SIGN_UP_DISABLED });
  }

  // Additional users can only sign-up with invitation code.
  const token = InvitationTokenSchema.safeParse(invitationToken);

  if (!token.success) {
    throw new APIError("FORBIDDEN", { message: AuthError.SIGN_UP_INVITATION_ONLY });
  }

  const valid = await service.isInvitationValid({ token: token.data, email });

  if (valid.status === "error") {
    throw valid.err;
  }

  if (!valid.result) {
    throw new APIError("FORBIDDEN", { message: AuthError.SIGN_UP_INVITATION_ONLY });
  }
};
