import { isNullish } from "@usenullish/nullish-common";
import type { Route } from "./+types/orgs.$org-id._index";
import { OrganizationChat } from "~/components/chat/organization-chat";
import { Onboarding } from "~/components/chat/onboarding";
import { usePendingOnboarding } from "~/components/chat/onboarding.hooks";
import { OrganizationsServer } from "~/context/server/organizations.server";

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationsServer.create().getReportsOnboarding(args);
};

const OrganizationPage = ({ loaderData }: Route.ComponentProps) => {
  const onboarding = usePendingOnboarding({ onboarding: loaderData });

  return isNullish(onboarding) ? <OrganizationChat /> : <Onboarding state={onboarding} />;
};

export default OrganizationPage;
