import { toast, type ToastT } from "sonner";
import { useNotifications } from "~/kit/notifications/notifications.context";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ToastDetailsAction = ({ toastId }: { toastId: ToastT["id"] }) => {
  const { i18n } = useI18n();
  const { setOpen } = useNotifications();

  const showDetails = () => {
    setOpen(true);
    toast.dismiss(toastId);
  };

  return (
    <button
      type="button"
      data-button
      style={{ background: "var(--error-text)", color: "var(--error-bg)" }}
      onClick={showDetails}
    >
      {i18n.core.action.details}
    </button>
  );
};
