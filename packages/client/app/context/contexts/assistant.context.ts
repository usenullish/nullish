import { createContext, useContext } from "react";
import { isArrayAtLeastOne, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";

type Assistant = Api["Assistant"]["Client"]["Assistant"];

type AssistantModel = NonNullable<Assistant["models"]>[number];

export const AssistantContext = createContext<Option<Assistant>>(undefined);

export const useAssistant = ():
  | { enabled: true; models: [AssistantModel, ...AssistantModel[]] }
  | { enabled: false } => {
  const models = useContext(AssistantContext)?.models ?? [];

  return isArrayAtLeastOne(models) ? { enabled: true, models } : { enabled: false };
};
