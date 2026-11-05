import type { Route } from "./+types/conversations.$id";
import { ConversationsServer } from "~/context/server/chat+conversations.server";
import { AuthGuard } from "~/components/auth/guards/auth-guard";
import { UnscopedChat } from "~/components/chat/unscoped-chat";
import { ConversationGuard } from "~/components/chat/guards/conversation-guard";
import { HomeLayout } from "~/components/layout/home-layout";
import { AppLayout } from "~/components/layout/app-layout";

export const loader = async (args: Route.LoaderArgs) => {
  return await ConversationsServer.create().getUnscopedConversation(args);
};

const UnscopedConversationPage = ({ loaderData }: Route.ComponentProps) => (
  <AppLayout>
    <AuthGuard>
      <HomeLayout>
        <ConversationGuard chat={loaderData?.chat} organizationId={null}>
          <UnscopedChat chat={loaderData?.chat} />
        </ConversationGuard>
      </HomeLayout>
    </AuthGuard>
  </AppLayout>
);

export default UnscopedConversationPage;
