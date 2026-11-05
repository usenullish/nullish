import { useLocation } from "react-router";
import type { Nullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Chat } from "~/components/chat/chat";
import { useGreeting } from "~/kit/user/greeting.hooks";
import { useUser } from "~/context/hooks/auth.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const UnscopedChat = ({
  chat,
}: {
  chat?: Nullish<Api["Conversations"]["Client"]["Chat"]>;
}) => {
  const { i18n } = useI18n();
  const user = useUser();
  const greeting = useGreeting({ name: user?.name });

  const location = useLocation();

  return (
    <Chat
      key={location.key}
      className="mx-auto h-[calc(100svh-5rem)] w-full max-w-3xl"
      domain={{ type: "unscoped" }}
      chat={chat}
      title={greeting ?? ""}
      placeholder={i18n.chat.label.placeholder_unscoped}
    />
  );
};
