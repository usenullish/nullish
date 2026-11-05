import { CircleCheck, OctagonX, type LucideIcon } from "lucide-react";
import { NotificationLevel } from "~/kit/notifications/notifications.services";

export const NOTIFICATION_ICONS: Record<
  NotificationLevel,
  { Icon: LucideIcon; className: string }
> = {
  [NotificationLevel.ERROR]: {
    Icon: OctagonX,
    className: "text-destructive",
  },
  [NotificationLevel.SUCCESS]: {
    Icon: CircleCheck,
    className: "text-success",
  },
};
