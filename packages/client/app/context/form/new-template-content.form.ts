import { assertNonNullish, type Result } from "@usenullish/nullish-common";
import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { TemplateContentsService } from "~/lib/services/document-templates+contents.services";
import type { ApiDocumentTemplatesWritableArgs } from "~/lib/api/_document-templates";

interface SubmitTemplateContentArgs {
  formData: FormData;
  templateId: ApiDocumentTemplatesWritableArgs["templateId"];
}

export const buildUseNewTemplateContentAction = ({
  templateId,
}: Pick<SubmitTemplateContentArgs, "templateId">): UseActionStateFn => {
  const useNewTemplateContentAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitTemplateContent({ formData, templateId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewTemplateContentAction;
};

const submitTemplateContent = async ({
  formData,
  templateId,
}: SubmitTemplateContentArgs): Promise<
  Result<Api["TemplateContents"]["Client"]["CreateTemplateContentResponse"]>
> => {
  const htmlFile = formData.get("html");
  assertNonNullish(htmlFile);
  const html = htmlFile instanceof File ? await htmlFile.text() : "";

  const content = ApiSchema.TemplateContents.CreateTemplateContentRequestSchema.parse({
    language: formData.get("language"),
    html,
  });

  return await TemplateContentsService.create().submit({ templateId, content });
};
