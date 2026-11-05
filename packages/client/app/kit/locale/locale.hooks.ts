import { useContext } from "react";
import { isNullish } from "@usenullish/nullish-common";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";

export const useLocale = (): string => {
  const { i18n } = useI18n();
  const organization = useContext(NonNullishOrganizationContext);

  return isNullish(organization?.country) ? i18n.lang : `${i18n.lang}-${organization.country}`;
};
