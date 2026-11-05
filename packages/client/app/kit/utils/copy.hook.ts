import { useEffect, useRef, useState } from "react";
import { useNotify } from "~/kit/notifications/notify.hook";
import { useI18n } from "~/kit/i18n/i18n.context";

const COPY_ANIMATION_DURATION_MS = 1500;

export const useCopy = (): { copy: (data: string) => Promise<void>; copied: boolean } => {
  const { i18n } = useI18n();
  const { notifyError } = useNotify();

  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const copy = async (data: string) => {
    try {
      await navigator.clipboard.writeText(data);
    } catch (err: unknown) {
      notifyError({ msg: i18n.core.toast.copy_error, detail: err });
      return;
    }

    clearTimeout(timeout.current);

    setCopied(true);
    timeout.current = setTimeout(() => setCopied(false), COPY_ANIMATION_DURATION_MS);
  };

  return { copy, copied };
};
