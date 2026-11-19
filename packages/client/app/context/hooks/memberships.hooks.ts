import type { Api } from "@usenullish/nullish-schema/server";
import { MembershipRole } from "@usenullish/nullish-schema/db";
import { useUser } from "~/context/hooks/auth.hooks";

export const useIsOrganizationAdmin = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): boolean => {
  const user = useUser();

  return (user?.roles ?? []).some(
    (membership) =>
      membership.organizationId === organizationId && membership.role === MembershipRole.ADMIN,
  );
};

export const useCanWrite = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): boolean => {
  const user = useUser();

  return (user?.roles ?? []).some(
    (membership) =>
      membership.organizationId === organizationId &&
      (membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.ACCOUNTANT),
  );
};
