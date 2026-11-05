import { createContext, useContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { ActiveConversationProviderState } from "~/kit/chat/active-conversation-provider";

export const NonNullishActiveConversationContext =
  createContext<Option<ActiveConversationProviderState>>(undefined);

export const useActiveConversation = () => {
  const context = useContext(NonNullishActiveConversationContext);
  assertNonNullish(
    context,
    "useActiveConversation must be used within a ActiveConversationProvider",
  );
  return context;
};
