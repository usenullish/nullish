import type { ReactNode } from "react";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCanWrite } from "~/context/hooks/memberships.hooks";

export const WriteGuard = ({ children }: { children: ReactNode }) => {
  const organization = useOrganization();
  const canWrite = useCanWrite({ organizationId: organization.id });

  return canWrite ? children : null;
};
