import { createContext, useContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";

export const SettingsContext =
  createContext<Option<Api["Settings"]["Client"]["Settings"]>>(undefined);

export const useSettings = () => useContext(SettingsContext);
