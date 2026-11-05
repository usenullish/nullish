import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const LlmUsageContext =
  createContext<Option<Api["LlmUsage"]["Client"]["GetLlmUsageResponse"]["llmUsage"]>>(undefined);

export const useLlmUsage = () => useContext(LlmUsageContext);
