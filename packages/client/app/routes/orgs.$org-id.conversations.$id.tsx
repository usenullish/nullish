import type { Route } from "./+types/orgs.$org-id.conversations.$id";
import { ConversationsServer } from "~/context/server/chat+conversations.server";
import { OrganizationChat } from "~/components/chat/organization-chat";
import { ConversationGuard } from "~/components/chat/guards/conversation-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await ConversationsServer.create().getOrganizationConversation(args);
};

const OrganizationConversationPage = ({ loaderData, params }: Route.ComponentProps) => (
  <ConversationGuard chat={loaderData?.chat} organizationId={params["org-id"] ?? null}>
    <OrganizationChat chat={loaderData?.chat} />
  </ConversationGuard>
);

export default OrganizationConversationPage;
