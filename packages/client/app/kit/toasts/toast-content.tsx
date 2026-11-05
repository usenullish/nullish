import type { NotifyMsg } from "~/kit/notifications/notify.hook";

export const ToastContent = ({ msg }: Pick<NotifyMsg, "msg">) => <span>{msg}</span>;
