import { useAuthPending, useSignedIn } from "~/context/hooks/auth.hooks";
import { useAuthSessionExpiry } from "~/kit/auth/auth-session-expiry.hook";
import SignIn from "~/routes/sign-in";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const signedIn = useSignedIn();
  const authPending = useAuthPending();

  useAuthSessionExpiry();

  // TODO: spinner?
  if (authPending) {
    return null;
  }

  if (signedIn) {
    return children;
  }

  return <SignIn />;
};
