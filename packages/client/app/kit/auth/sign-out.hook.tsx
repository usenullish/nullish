import { useLocation, useNavigate, useRevalidator } from "react-router";
import { authClient } from "@usenullish/nullish-auth/client";
import * as z from "zod";

const SignOutStateSchema = z.strictObject({ expired: z.boolean().optional() });

type SignOutState = z.infer<typeof SignOutStateSchema>;

export const useSignOut = ({ expired }: SignOutState = { expired: false }) => {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  return async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await navigate("/", { state: { expired } });
          await revalidate();
        },
      },
    });
  };
};

export const useSessionExpired = (): boolean => {
  const { state } = useLocation();
  return SignOutStateSchema.safeParse(state).data?.expired === true;
};
