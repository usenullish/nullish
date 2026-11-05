import { useLocation } from "react-router";
import type { Nullish } from "@usenullish/nullish-common";
import { useOrganization } from "~/context/contexts/organization.context";
import { Chat } from "~/components/chat/chat";
import type { Api } from "@usenullish/nullish-schema/server";
import { useGreeting } from "~/kit/user/greeting.hooks";
import { useUser } from "~/context/hooks/auth.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const OrganizationChat = ({
  chat,
}: {
  chat?: Nullish<Api["Conversations"]["Client"]["Chat"]>;
}) => {
  const { i18n } = useI18n();

  const organization = useOrganization();

  const user = useUser();
  const greeting = useGreeting({ name: user?.name });

  const location = useLocation();

  return (
    <Chat
      key={location.key}
      className="mx-auto h-[calc(100svh-5rem)] w-full max-w-3xl"
      domain={{ type: "organization", organizationId: organization.id }}
      chat={chat}
      title={greeting ?? ""}
      placeholder={replacePlaceholders(i18n.chat.label.placeholder_organization, {
        "{organization}": organization.name,
      })}
    />
  );
};
