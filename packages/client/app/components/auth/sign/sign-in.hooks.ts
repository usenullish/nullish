import { useNavigate, useRevalidator } from "react-router";
import { isArrayExactlyOne, nonNullish } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { InvitationPath, OrganizationPath } from "~/navigation";
import { useInvitationToken } from "~/kit/auth/auth-redirect.hook";

const redirectToPathOnSuccess = async (): Promise<string> => {
  const { data } = await authClient.getSession();
  const roles = data?.user.roles ?? [];

  if (!isArrayExactlyOne(roles)) {
    return "/";
  }

  const [{ organizationId }] = roles;
  return OrganizationPath.create({ organizationId }).to();
};

export const useRedirectAfterSignIn = (): (() => Promise<void>) => {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const invitationToken = useInvitationToken();

  return async () => {
    await revalidate();
    await navigate(
      nonNullish(invitationToken)
        ? InvitationPath.create({ token: invitationToken }).toAccept()
        : await redirectToPathOnSuccess(),
      { replace: true },
    );
  };
};
