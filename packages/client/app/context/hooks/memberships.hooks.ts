import type { Api } from "@usenullish/nullish-schema/server";
import { useUser } from "~/context/hooks/auth.hooks";

export const useIsOrganizationAdmin = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): boolean => {
  const user = useUser();

  return (user?.roles ?? []).some(
    (membership) => membership.organizationId === organizationId && membership.role === "admin",
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
      (membership.role === "admin" || membership.role === "accountant"),
  );
};
