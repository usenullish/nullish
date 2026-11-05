import type { Languages } from "~/kit/i18n/lang";
import { NonNullishI18nContext } from "~/kit/i18n/i18n.context";
import { useState } from "react";
import { switchLang } from "~/kit/i18n/i18n.services";
import type { I18nState } from "~/kit/i18n/i18n.loaders";
import { useNotify } from "~/kit/notifications/notify.hook";

export interface I18nProviderState {
  i18n: I18nState;
  switchLang: (lang: Languages) => Promise<void>;
}

export const I18nProvider = ({
  children,
  initialI18n,
}: {
  children: React.ReactNode;
  initialI18n: I18nState;
}) => {
  const [i18n, setI18n] = useState<I18nState>(initialI18n);
  const { notifyError } = useNotify();

  const value: I18nProviderState = {
    i18n,
    switchLang: async (lang: Languages) => {
      const result = await switchLang({ lang });

      if (result.status === "error") {
        notifyError({ msg: i18n.core.state.language_error, detail: result.err });
        return;
      }

      setI18n(result.result);
    },
  };

  return <NonNullishI18nContext.Provider value={value}>{children}</NonNullishI18nContext.Provider>;
};
