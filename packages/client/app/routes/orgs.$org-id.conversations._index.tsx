import { OrganizationChat } from "~/components/chat/organization-chat";
import type { RouteHandle } from "~/kit/router/route-handle";
import { OrganizationRootPath } from "~/navigation";

export const handle: Pick<RouteHandle, "breadcrumb"> = {
  breadcrumb: {
    back: ({ organizationId }) => OrganizationRootPath.create({ organizationId }).to(),
    label: ({ i18n }) => i18n.chat.label.conversation,
  },
};

const OrganizationNewConversationPage = () => <OrganizationChat />;

export default OrganizationNewConversationPage;
