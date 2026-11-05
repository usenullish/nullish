import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotifications } from "~/kit/notifications/notifications.context";
import { type Notification, NotificationLevel } from "~/kit/notifications/notifications.services";
import { NOTIFICATION_ICONS } from "~/components/notifications/notification-icon";
import { DrawnCheck } from "~/components/notifications/drawn-check";
import { Button } from "~/ui/components/button";

const FLASH_DURATION_MS = 4000;

export const NotificationsIndicator = () => {
  const { i18n } = useI18n();
  const { notifications, setOpen } = useNotifications();

  const [latest] = notifications;

  const [flashedId, setFlashedId] = useState<Option<Notification["id"]>>(undefined);

  useEffect(() => {
    if (isNullish(latest)) {
      return;
    }

    const timeout = setTimeout(() => setFlashedId(latest.id), FLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [latest]);

  const flashing =
    nonNullish(latest) && latest.level !== NotificationLevel.ERROR && latest.id !== flashedId;

  const unreadErrors = notifications.filter(
    ({ level, read }) => level === NotificationLevel.ERROR && !read,
  ).length;

  const color = flashing
    ? NOTIFICATION_ICONS[latest.level].className
    : unreadErrors > 0
      ? NOTIFICATION_ICONS[NotificationLevel.ERROR].className
      : undefined;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={color}
        aria-label={i18n.notifications.label.notifications}
        onClick={() => setOpen(true)}
      >
        {flashing && latest.level === NotificationLevel.SUCCESS ? (
          <DrawnCheck key={latest.id} />
        ) : (
          <Bell className="animate-in duration-300 fade-in zoom-in-75" />
        )}
        {unreadErrors > 0 && unreadErrors}
      </Button>

      <span className="sr-only" aria-live="polite">
        {latest?.msg}
      </span>
    </>
  );
};
