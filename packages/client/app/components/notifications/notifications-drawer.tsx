import { cn } from "cn";
import { nonNullish, notEmptyString } from "@usenullish/nullish-common";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { errorApiInfo, errorDetailToString, errorReason } from "~/kit/error-drawer/errors.utils";
import { useNotifications } from "~/kit/notifications/notifications.context";
import { type Notification, NotificationLevel } from "~/kit/notifications/notifications.services";
import { NOTIFICATION_ICONS } from "~/components/notifications/notification-icon";
import { Button } from "~/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/ui/components/sheet";

const NotificationRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="contents">
    <dt className="text-muted-foreground">{label}</dt>
    <dd>{value}</dd>
  </div>
);

const NotificationErrorDetails = ({ detail }: Pick<Notification, "detail">) => {
  const { i18n } = useI18n();

  const reason = errorReason(detail);
  const info = errorApiInfo(detail);
  const technical = errorDetailToString(detail);

  return (
    <>
      <span>{notEmptyString(reason) ? reason : i18n.errors.text.unexpected}</span>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        {nonNullish(info) && <NotificationRow label={i18n.core.label.status} value={info.status} />}

        {nonNullish(info?.code) && (
          <NotificationRow label={i18n.core.label.code} value={info.code} />
        )}
      </dl>

      {notEmptyString(technical) && (
        <pre className="font-mono break-all whitespace-pre-wrap text-muted-foreground">
          {technical}
        </pre>
      )}
    </>
  );
};

const NotificationItem = ({
  notification: { level, msg, detail, date },
}: {
  notification: Notification;
}) => {
  const formatDateTime = useFormatDateTime();

  const { Icon, className } = NOTIFICATION_ICONS[level];

  return (
    <li className="flex gap-3 border-b pb-4 last:border-b-0">
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="font-medium">{msg}</span>

        <span className="text-xs text-muted-foreground">{formatDateTime(date)}</span>

        {level === NotificationLevel.ERROR && nonNullish(detail) && (
          <NotificationErrorDetails detail={detail} />
        )}
      </div>
    </li>
  );
};

export const NotificationsDrawer = () => {
  const { i18n } = useI18n();
  const { notifications, open, setOpen, clearNotifications } = useNotifications();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent>
        <SheetHeader className="flex-row p-3">
          <SheetTitle className="sr-only">{i18n.notifications.label.notifications}</SheetTitle>

          <Button variant="outline" size="sm" onClick={clearNotifications}>
            {i18n.core.action.clear}
          </Button>
        </SheetHeader>

        {notifications.length === 0 ? (
          <p className="px-4 text-xs text-muted-foreground">{i18n.notifications.text.empty}</p>
        ) : (
          <ul className="flex flex-col gap-4 overflow-y-auto px-4 pb-4">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
};
