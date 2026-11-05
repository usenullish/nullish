import * as z from "zod";

export enum AuthError {
  SIGN_UP_DISABLED = "sign_up_disabled",
  SIGN_UP_INVITATION_ONLY = "sign_up_invitation_only",
  USER_HAS_ORGANIZATIONS = "user_has_organizations",
  USER_HAS_API_KEYS = "user_has_api_keys",
}

export const AuthErrorSchema = z.enum(AuthError);
