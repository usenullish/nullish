import { isNullish } from "@usenullish/nullish-common";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import * as z from "zod";
import type { UseActionStateFn } from "~/context/form/form";
import {
  type JournalPostingSide,
  readJournalPostingFormFields,
  readJournalPostingsFormRows,
} from "~/context/form/_journal.form";
import { readTextFormField } from "~/context/form/_contact-details.form";
import { JournalService } from "~/lib/services/journal.services";
import type { ApiJournalGetByIdArgs } from "~/lib/api/_journal";

const [UpdatePostingSchema, NewPostingSchema] =
  ApiSchema.Journal.UpdateJournalEntryRequestSchema.shape.postings.element.options;

const FORM_AMOUNTS = {
  debit: z.coerce.bigint(),
  credit: z.coerce.bigint(),
  exchangeRate: z.coerce.number(),
};

const FormJournalEditSchema = z.strictObject({
  entry: ApiSchema.Journal.UpdateJournalEntryRequestSchema.shape.entry.extend({
    validOn: z.coerce.date(),
    version: z.coerce.number(),
  }),
  postings: z
    .array(
      z.union([
        UpdatePostingSchema.extend({ ...FORM_AMOUNTS, version: z.coerce.number() }),
        NewPostingSchema.extend(FORM_AMOUNTS),
      ]),
    )
    .min(2),
});

export const buildUseJournalEditAction = ({ id }: ApiJournalGetByIdArgs): UseActionStateFn => {
  const useJournalEditAction: UseActionStateFn = async (_prevState, formData) => {
    const values = FormJournalEditSchema.parse({
      entry: {
        validOn: formData.get("validOn"),
        reference: readTextFormField({ formData, key: "reference" }),
        version: formData.get("version"),
      },
      postings: readJournalPostingsFormRows({ formData, readPosting }),
    });

    const result = await JournalService.create().update({ id, values });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useJournalEditAction;
};

const readPosting = ({
  formData,
  row,
  side,
}: {
  formData: FormData;
  row: number;
  side: JournalPostingSide;
}) => {
  const fields = readJournalPostingFormFields({ formData, row, side });

  if (isNullish(fields)) {
    return undefined;
  }

  const posting = {
    ...fields,
    vatRateId: readTextFormField({ formData, key: `postings[${row}].${side}.vatRateId` }),
  };

  const id = readTextFormField({ formData, key: `postings[${row}].${side}.id` });

  if (isNullish(id)) {
    return posting;
  }

  return { ...posting, id, version: formData.get(`postings[${row}].${side}.version`) };
};
