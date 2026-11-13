import { assertNotEmptyString } from "@usenullish/nullish-common";

export const envAppUrl = (): string => {
  const url = process.env.NULLISH_APP_URL;
  assertNotEmptyString(url, "A base URL for the app must be defined.");
  return url;
};
