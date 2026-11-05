import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const OrganizationsContext =
  createContext<
    Option<Api["Organizations"]["Client"]["GetOrganizationsResponse"]["organizations"]>
  >(undefined);

export const useOrganizations = () => useContext(OrganizationsContext);
