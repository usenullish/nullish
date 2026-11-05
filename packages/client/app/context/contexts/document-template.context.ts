import { createContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const NonNullishDocumentTemplateContext =
  createContext<
    Option<Api["DocumentTemplates"]["Client"]["GetDocumentTemplateResponse"]["template"]>
  >(undefined);

export const useDocumentTemplate = () => {
  const template = useContext(NonNullishDocumentTemplateContext);
  assertNonNullish(template);
  return template;
};
