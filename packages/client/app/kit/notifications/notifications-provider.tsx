import { useCallback, useRef, useState } from "react";
import type {
  Notification,
  Notifications,
  NotifyArgs,
} from "~/kit/notifications/notifications.services";
import { NonNullishNotificationsContext } from "~/kit/notifications/notifications.context";

export interface NotificationsState {
  notifications: Notifications;
  open: boolean;
  setOpen: (open: boolean) => void;
  notify: (args: NotifyArgs) => Notification;
  clearNotifications: () => void;
}

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notifications>([]);
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);

  const notify = useCallback(({ level, msg, detail }: NotifyArgs): Notification => {
    const notification: Notification = {
      id: crypto.randomUUID(),
      level,
      msg,
      detail,
      date: new Date(),
      read: openRef.current,
    };

    setNotifications((current) => [notification, ...current]);

    return notification;
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    openRef.current = next;

    if (next) {
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true })),
      );
    }
  }, []);

  const value: NotificationsState = {
    notifications,
    open,
    setOpen,
    notify,
    clearNotifications: () => {
      setNotifications([]);
      setOpen(false);
    },
  };

  return (
    <NonNullishNotificationsContext.Provider value={value}>
      {children}
    </NonNullishNotificationsContext.Provider>
  );
};
