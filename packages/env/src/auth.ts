import { isEmptyString, NotEmptyStringSchema } from "@usenullish/nullish-common";
import * as z from "zod";

const SignUpSchema = z
  .union([
    z.literal("invite_only"),
    z.stringbool({ truthy: ["true"], falsy: ["false"], case: "sensitive" }),
  ])
  .default("invite_only");

export type SignUp = z.infer<typeof SignUpSchema>;

export const envSignUp = (): SignUp => {
  const signUp = process.env.NULLISH_AUTH_SIGN_UP;
  return SignUpSchema.parse(isEmptyString(signUp) ? undefined : signUp);
};

const AuthSecretSchema = NotEmptyStringSchema.min(32, {
  error: "The secret for the authentication must be at least 32 characters long.",
});

export const envAuthSecret = (): string => {
  const secret = process.env.NULLISH_AUTH_SECRET;
  return AuthSecretSchema.parse(secret);
};
