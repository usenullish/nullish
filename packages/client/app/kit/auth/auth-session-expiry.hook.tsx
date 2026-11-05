import { useEffect } from "react";
import { authClient } from "@usenullish/nullish-auth/client";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { useSignOut } from "~/kit/auth/sign-out.hook";

// TODO: replace with https://github.com/better-auth/better-auth/issues/10061 if it ever gets implemented
export const useAuthSessionExpiry = () => {
  const { data: session } = authClient.useSession();
  const signOut = useSignOut({ expired: true });

  const expiresAt = session?.session.expiresAt;
  const expiresTime = nonNullish(expiresAt) ? new Date(expiresAt).getTime() : undefined;

  useEffect(() => {
    if (isNullish(expiresTime)) {
      return;
    }

    const timeout = setTimeout(() => void signOut(), Math.max(expiresTime - Date.now(), 0));

    return () => clearTimeout(timeout);
  }, [expiresTime, signOut]);
};
