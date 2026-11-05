import { useCallback } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import { toast, type ToastT } from "sonner";
import { ToastContent } from "~/kit/toasts/toast-content";
import { ToastDetailsAction } from "~/kit/toasts/toast-details-action";
import { useNotifications } from "~/kit/notifications/notifications.context";
import { NotificationLevel } from "~/kit/notifications/notifications.services";

export interface NotifyMsg {
  msg: string;
  detail?: unknown;
  duration?: number;
}

const position: ToastT["position"] = "top-right";

export const useNotify = () => {
  const { notify } = useNotifications();

  const notifyError = useCallback(
    ({ msg, detail }: NotifyMsg) => {
      console.error(msg, detail);

      if (nonNullish(detail) && detail instanceof Error && !(detail.cause instanceof Error)) {
        console.error("Cause of the error:", detail.cause);
      }

      const { id } = notify({ level: NotificationLevel.ERROR, msg, detail });

      toast.error(<ToastContent msg={msg} />, {
        id,
        action: nonNullish(detail) && <ToastDetailsAction toastId={id} />,
        duration: Infinity,
        closeButton: true,
        position,
      });
    },
    [notify],
  );

  const notifySuccess = useCallback(
    ({ msg }: Omit<NotifyMsg, "detail">) => {
      notify({ level: NotificationLevel.SUCCESS, msg });
    },
    [notify],
  );

  return { notifyError, notifySuccess };
};
