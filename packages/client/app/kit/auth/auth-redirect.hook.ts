import { useLocation } from "react-router";
import type { Option } from "@usenullish/nullish-common";
import * as z from "zod";

const AuthRedirectStateSchema = z.object({
  invitationToken: z.string(),
});

export type AuthRedirectState = z.infer<typeof AuthRedirectStateSchema>;

export const useInvitationToken = (): Option<string> => {
  const { state } = useLocation();
  return AuthRedirectStateSchema.safeParse(state).data?.invitationToken;
};
