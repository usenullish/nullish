import { isNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCanWrite } from "~/context/hooks/memberships.hooks";

type Onboarding = Api["Onboarding"]["Client"]["GetOnboardingResponse"];

export const usePendingOnboarding = ({
  onboarding,
}: {
  onboarding: Option<Onboarding>;
}): Option<Onboarding> => {
  const organization = useOrganization();
  const canWrite = useCanWrite({ organizationId: organization.id });

  if (isNullish(onboarding)) {
    return undefined;
  }

  const { hasClients, hasInvoices, hasBankRelations } = onboarding;

  if (!canWrite || (hasClients && hasInvoices && hasBankRelations)) {
    return undefined;
  }

  return onboarding;
};
