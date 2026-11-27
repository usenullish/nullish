import type { Route } from "./+types/orgs.$org-id._index";
import { OrganizationChat } from "~/components/chat/organization-chat";
import { GettingStarted } from "~/components/chat/getting-started";
import { loadGettingStarted } from "~/context/loaders/getting-started.loader.server";
import { useOrganization } from "~/context/contexts/organization.context";
import { useCanWrite } from "~/context/hooks/memberships.hooks";

export const loader = async (args: Route.LoaderArgs) => {
  return await loadGettingStarted(args);
};

const OrganizationPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const canWrite = useCanWrite({ organizationId: organization.id });

  if (!canWrite || Object.values(loaderData).every(Boolean)) {
    return <OrganizationChat />;
  }

  return <GettingStarted state={loaderData} />;
};

export default OrganizationPage;
