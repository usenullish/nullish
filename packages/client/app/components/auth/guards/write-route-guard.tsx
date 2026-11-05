import type { ReactNode } from "react";
import { Navigate, useMatches } from "react-router";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCanWrite } from "~/context/hooks/memberships.hooks";
import { OrganizationPath } from "~/navigation";
import { isPermissionHandle } from "~/kit/router/route-handle";

export const WriteRouteGuard = ({ children }: { children: ReactNode }) => {
  const organization = useOrganization();
  const canWrite = useCanWrite({ organizationId: organization.id });
  const matches = useMatches();

  if (
    !canWrite &&
    matches.some(({ handle }) => isPermissionHandle(handle) && handle.permission.write)
  ) {
    return (
      <Navigate to={OrganizationPath.create({ organizationId: organization.id }).to()} replace />
    );
  }

  return children;
};
