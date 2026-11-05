import { useCurrencies } from "~/context/contexts/currencies.context";
import type { Api } from "@usenullish/nullish-schema/server";
import { isNullish, type Option } from "@usenullish/nullish-common";
import { usePrivacy } from "~/kit/privacy/privacy.context";
import { useFormatAmount } from "~/kit/format/amount.hooks";

export const Amount = ({
  amount,
  currencyCode,
}: {
  amount: bigint;
  currencyCode: Option<Api["Currencies"]["Client"]["Currency"]["code"]>;
}) => {
  const { privacy } = usePrivacy();
  const currencies = useCurrencies();
  const formatAmount = useFormatAmount();

  if (privacy.enabled) {
    return <span>{Array.from({ length: 5 }).map(() => `●`)}</span>;
  }

  const currency = (currencies ?? []).find(({ code }) => code === currencyCode);

  if (isNullish(currency)) {
    return <span>---</span>;
  }

  const formatted = formatAmount({ currency, amount });

  if (isNullish(formatted)) {
    return <span>---</span>;
  }

  return <span>{formatted}</span>;
};
