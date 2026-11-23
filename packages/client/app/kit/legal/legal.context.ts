import { createContext, useContext } from "react";
import type { Nullish } from "@usenullish/nullish-common";
import type { Legal } from "~/kit/legal/legal.services";

export const LegalContext = createContext<Nullish<Legal>>(undefined);

export const useLegal = () => useContext(LegalContext);
