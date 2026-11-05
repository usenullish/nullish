import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { DocumentTemplatesService } from "~/lib/services/document-templates.services";

type CreatedDocumentTemplate = Api["DocumentTemplates"]["Client"]["CreateDocumentTemplateResponse"];

interface SubmitDocumentTemplateArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewDocumentTemplateAction = ({
  organizationId,
}: Pick<
  SubmitDocumentTemplateArgs,
  "organizationId"
>): UseActionStateFn<CreatedDocumentTemplate> => {
  const useNewDocumentTemplateAction: UseActionStateFn<CreatedDocumentTemplate> = async (
    _prevState,
    formData,
  ) => {
    const result = await submitDocumentTemplate({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewDocumentTemplateAction;
};

const FormCreateDocumentTemplateSchema =
  ApiSchema.DocumentTemplates.CreateDocumentTemplateRequestSchema;

const submitDocumentTemplate = async ({
  formData,
  organizationId,
}: SubmitDocumentTemplateArgs): Promise<Result<CreatedDocumentTemplate>> => {
  const template = FormCreateDocumentTemplateSchema.parse({
    type: formData.get("type"),
    name: formData.get("name"),
  });

  return await DocumentTemplatesService.create().submit({ organizationId, template });
};
