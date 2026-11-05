import { createContext, useContext } from "react";
import type { Option } from "@usenullish/nullish-common";

export const NonceContext = createContext<Option<string>>(undefined);

export const useNonce = (): Option<string> => useContext(NonceContext);
