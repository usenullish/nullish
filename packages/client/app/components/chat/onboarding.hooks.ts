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

  if (!canWrite || isNullish(onboarding) || Object.values(onboarding).every(Boolean)) {
    return undefined;
  }

  return onboarding;
};
