import type { Route } from "./+types/orgs.$org-id.conversations.$id";
import { ConversationsServer } from "~/context/server/chat+conversations.server";
import { OrganizationChat } from "~/components/chat/organization-chat";
import { ConversationGuard } from "~/components/chat/guards/conversation-guard";
import type { RouteHandle } from "~/kit/router/route-handle";
import { OrganizationRootPath } from "~/navigation";

export const handle: Pick<RouteHandle, "breadcrumb"> = {
  breadcrumb: {
    back: ({ organizationId }) => OrganizationRootPath.create({ organizationId }).to(),
    label: ({ i18n }) => i18n.chat.label.conversation,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await ConversationsServer.create().getOrganizationConversation(args);
};

const OrganizationConversationPage = ({ loaderData, params }: Route.ComponentProps) => (
  <ConversationGuard chat={loaderData?.chat} organizationId={params["org-id"] ?? null}>
    <OrganizationChat chat={loaderData?.chat} />
  </ConversationGuard>
);

export default OrganizationConversationPage;
