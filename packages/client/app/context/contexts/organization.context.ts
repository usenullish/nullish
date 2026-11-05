import { createContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const NonNullishOrganizationContext =
  createContext<Option<Api["Organizations"]["Client"]["Organization"]>>(undefined);

export const useOrganization = () => {
  const organization = useContext(NonNullishOrganizationContext);
  assertNonNullish(organization);
  return organization;
};
