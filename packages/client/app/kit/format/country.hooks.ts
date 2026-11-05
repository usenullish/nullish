import { useCallback, useMemo } from "react";
import { useI18n } from "~/kit/i18n/i18n.context";

export const useFormatCountry = (): ((code: string) => string) => {
  const { i18n } = useI18n();

  const names = useMemo(() => new Intl.DisplayNames([i18n.lang], { type: "region" }), [i18n.lang]);

  return useCallback((code) => names.of(code) ?? code, [names]);
};
