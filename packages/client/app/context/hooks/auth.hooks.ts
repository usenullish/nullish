import { authClient, type CustomSession } from "@usenullish/nullish-auth/client";
import { nonNullish, type Nullish } from "@usenullish/nullish-common";

export const useUser = (): Nullish<CustomSession["user"]> => {
  const { data: session } = authClient.useSession();
  return session?.user ?? null;
};

export const useSignedIn = () => {
  const user = useUser();
  return nonNullish(user);
};

export const useAuthPending = () => {
  const { isPending } = authClient.useSession();
  return isPending;
};
