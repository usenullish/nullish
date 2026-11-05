import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { isNullish, type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { JournalService } from "~/lib/services/journal.services";
import type { UseActionStateFn } from "~/context/form/form";
import {
  readJournalPostingFormFields,
  readJournalPostingsFormRows,
} from "~/context/form/_journal.form";
import { readTextFormField } from "~/context/form/_contact-details.form";

interface SubmitJournalArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

type CreatedJournal = Api["Journal"]["Client"]["CreateJournalEntryResponse"];

export const buildUseNewJournalAction = ({
  organizationId,
}: Pick<SubmitJournalArgs, "organizationId">): UseActionStateFn<CreatedJournal> => {
  const useNewOrganizationAction: UseActionStateFn<CreatedJournal> = async (
    _prevState,
    formData,
  ) => {
    const result = await submitJournal({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewOrganizationAction;
};

const submitJournal = async ({
  organizationId,
  ...rest
}: SubmitJournalArgs): Promise<Result<CreatedJournal>> => {
  try {
    const body = build(rest);

    return await JournalService.create().submit({
      organizationId,
      body,
    });
  } catch (err: unknown) {
    console.log(err);
    return { status: "error", err };
  }
};

const FormCreateJournalEntrySchema = z.strictObject({
  entry: ApiSchema.Journal.CreateJournalEntryRequestSchema.shape.entry.extend({
    validOn: z.coerce.date(),
  }),
  postings: z
    .array(
      ApiSchema.Journal.CreateJournalEntryRequestSchema.shape.postings.element.extend({
        debit: z.coerce.bigint(),
        credit: z.coerce.bigint(),
        exchangeRate: z.coerce.number(),
      }),
    )
    .min(2),
});

const build = ({
  formData,
}: Omit<
  SubmitJournalArgs,
  "organizationId"
>): Api["Journal"]["Client"]["CreateJournalEntryBody"] => {
  return FormCreateJournalEntrySchema.parse({
    entry: {
      validOn: formData.get("validOn"),
      reference: readTextFormField({ formData, key: "reference" }),
    },
    postings: readJournalPostingsFormRows({
      formData,
      readPosting: ({ formData, row, side }) => {
        const fields = readJournalPostingFormFields({ formData, row, side });

        return isNullish(fields)
          ? undefined
          : {
              ...fields,
              vatRateId: readTextFormField({ formData, key: `postings[${row}].${side}.vatRateId` }),
            };
      },
    }),
  });
};
