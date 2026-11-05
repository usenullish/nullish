import { currencyCodeReference } from "./core/currencies";
import { numeric } from "./_common";
import { vatRateIdReference } from "./core/vat";
import { EXCHANGE_RATE_DECIMALS, EXCHANGE_RATE_PRECISION } from "../constants/currencies";

export const monetaryFields = () => ({
  vatRateId: vatRateIdReference(),
  currency: currencyCodeReference(),
  exchangeRate: numeric({ precision: EXCHANGE_RATE_PRECISION, scale: EXCHANGE_RATE_DECIMALS })
    .notNull()
    .default(1),
});
