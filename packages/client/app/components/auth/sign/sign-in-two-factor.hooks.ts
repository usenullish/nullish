import { startTransition, useState } from "react";
import type { Nullable } from "@usenullish/nullish-common";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { useRedirectAfterSignIn } from "~/components/auth/sign/sign-in.hooks";

export const useVerifyTwoFactor = () => {
  const authErrorMessage = useAuthErrorMessage();
  const onSignedIn = useRedirectAfterSignIn();

  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  const clearError = () => startTransition(() => setError(null));

  const fetchOptions = {
    onRequest: () => {
      setPending(true);
    },
    onSuccess: async () => {
      await onSignedIn();
    },
    onError: ({ error: { message } }: { error: { message: string } }) => {
      setPending(false);
      startTransition(() => setError(authErrorMessage(message)));
    },
  };

  return { error, pending, clearError, fetchOptions, trustDevice, setTrustDevice };
};
