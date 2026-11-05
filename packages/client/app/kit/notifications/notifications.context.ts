import { createContext, useContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { NotificationsState } from "~/kit/notifications/notifications-provider";

export const NonNullishNotificationsContext = createContext<Option<NotificationsState>>(undefined);

export const useNotifications = () => {
  const context = useContext(NonNullishNotificationsContext);
  assertNonNullish(context, "useNotifications must be used within a NotificationsProvider");
  return context;
};
