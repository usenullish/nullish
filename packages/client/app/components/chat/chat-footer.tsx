import { Link } from "react-router";
import { isNullish, type Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { ChatHistory } from "~/components/chat/chat-history";
import { OrganizationPath, UnscopedPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

type OrganizationId = Api["Organizations"]["Client"]["Organization"]["id"];

export const ChatFooter = ({
  organizationId,
  started,
}: {
  organizationId: Nullable<OrganizationId>;
  started: boolean;
}) => {
  const { i18n } = useI18n();

  const path = isNullish(organizationId)
    ? UnscopedPath.create()
    : OrganizationPath.create({ organizationId });

  return (
    <div className="flex gap-1">
      <ChatHistory organizationId={organizationId} />

      {started && (
        <Button variant="outline" size="xs" nativeButton={false} render={<Link to={path.to()} />}>
          {i18n.chat.action.new_conversation}
        </Button>
      )}
    </div>
  );
};
