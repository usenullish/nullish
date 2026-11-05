import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const ClientsContext =
  createContext<Option<Api["Clients"]["Client"]["GetClientsResponse"]["clients"]>>(undefined);

export const useClients = () => useContext(ClientsContext);
