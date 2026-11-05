import { useState } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { NonNullishActiveConversationContext } from "~/kit/chat/active-conversation.context";

type Conversation = Api["Conversations"]["Client"]["Conversation"];

export interface ActiveConversation {
  organizationId: Conversation["organizationId"];
  conversationId: Conversation["id"];
}

export interface ActiveConversationProviderState {
  activeConversation: Option<ActiveConversation>;
  setActiveConversation: (activeConversation: Option<ActiveConversation>) => void;
}

export const ActiveConversationProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeConversation, setActiveConversation] =
    useState<Option<ActiveConversation>>(undefined);

  const value: ActiveConversationProviderState = {
    activeConversation,
    setActiveConversation,
  };

  return (
    <NonNullishActiveConversationContext.Provider value={value}>
      {children}
    </NonNullishActiveConversationContext.Provider>
  );
};
