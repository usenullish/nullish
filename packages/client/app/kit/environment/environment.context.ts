import { createContext, useContext } from "react";
import type { Nullish } from "@usenullish/nullish-common";
import type { Environment } from "~/kit/environment/environment.services";

export const EnvironmentContext = createContext<Nullish<Environment>>(undefined);

export const useEnvironment = () => useContext(EnvironmentContext);
