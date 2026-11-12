import { useLocation } from "react-router";
import type { Option } from "@usenullish/nullish-common";
import * as z from "zod";

const SignUpVerifyEmailStateSchema = z.object({
  email: z.email(),
});

export const useSignUpEmail = (): Option<string> => {
  const { state } = useLocation();
  return SignUpVerifyEmailStateSchema.safeParse(state).data?.email;
};
