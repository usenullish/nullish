import type { UseActionStateFn } from "~/context/form/form";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import { TemplateContentsService } from "~/lib/services/document-templates+contents.services";
import type { ApiTemplateContentsGetByIdArgs } from "~/lib/api/_document-templates";

const FormTemplateContentEditSchema =
  ApiSchema.TemplateContents.UpdateTemplateContentRequestSchema.extend({
    version: z.coerce.number(),
  });

export const buildUseTemplateContentEditAction = ({
  id,
}: ApiTemplateContentsGetByIdArgs): UseActionStateFn => {
  const useTemplateContentEditAction: UseActionStateFn = async (_prevState, formData) => {
    const htmlFile = formData.get("html");
    const html = htmlFile instanceof File && htmlFile.size > 0 ? await htmlFile.text() : undefined;

    const values = FormTemplateContentEditSchema.parse({
      language: formData.get("language"),
      html,
      version: formData.get("version"),
    });

    const result = await TemplateContentsService.create().update({ id, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useTemplateContentEditAction;
};
