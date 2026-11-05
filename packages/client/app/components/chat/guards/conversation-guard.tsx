import { Navigate } from "react-router";
import { isNullish, type Nullable, type Nullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { OrganizationRootPath, UnscopedPath } from "~/navigation";

export const ConversationGuard = ({
  chat,
  organizationId,
  children,
}: {
  chat: Nullish<Api["Conversations"]["Client"]["Chat"]>;
  organizationId: Nullable<Api["Organizations"]["Client"]["Organization"]["id"]>;
  children: React.ReactNode;
}) => {
  const conversation = chat?.conversation;

  if (isNullish(conversation) || conversation.organizationId === organizationId) {
    return children;
  }

  const { organizationId: conversationOrgId } = conversation;

  const navigate = isNullish(conversationOrgId)
    ? UnscopedPath.create()
    : OrganizationRootPath.create({ organizationId: conversationOrgId });

  const to = navigate.toConversation({
    conversationId: conversation.id,
  });

  return <Navigate to={to} replace />;
};
