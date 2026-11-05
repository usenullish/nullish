import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { DocumentTemplatesService } from "~/lib/services/document-templates.services";
import * as z from "zod";

interface SubmitDocumentTemplateEditArgs {
  formData: FormData;
  templateId: Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"];
}

export const buildUseDocumentTemplateEditAction = ({
  templateId,
}: Pick<SubmitDocumentTemplateEditArgs, "templateId">): UseActionStateFn => {
  const useDocumentTemplateEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitDocumentTemplateEdit({
      formData,
      templateId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useDocumentTemplateEditAction;
};

const FormDocumentTemplateEditSchema =
  ApiSchema.DocumentTemplates.UpdateDocumentTemplateRequestSchema.extend({
    version: z.coerce.number(),
  });

const submitDocumentTemplateEdit = async ({
  formData,
  templateId,
}: SubmitDocumentTemplateEditArgs): Promise<
  Result<Api["DocumentTemplates"]["Client"]["UpdateDocumentTemplateResponse"]>
> => {
  const values = FormDocumentTemplateEditSchema.parse({
    type: formData.get("type"),
    name: formData.get("name"),
    version: formData.get("version"),
  });

  return await DocumentTemplatesService.create().update({ templateId, values });
};
