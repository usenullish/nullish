import { createContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const NonNullishClientContext =
  createContext<Option<Api["Clients"]["Client"]["GetClientResponse"]["client"]>>(undefined);

export const useClient = () => {
  const client = useContext(NonNullishClientContext);
  assertNonNullish(client);
  return client;
};
