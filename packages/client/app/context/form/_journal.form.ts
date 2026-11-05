import {
  createTokenSchema,
  isNullish,
  nonNullish,
  notEmptyString,
} from "@usenullish/nullish-common";
import { readTextFormField } from "~/context/form/_contact-details.form";
import { readDecimalsFormField } from "~/context/form/_decimals.form";

export type JournalPostingSide = "debit" | "credit";

export const JOURNAL_POSTING_SIDES: JournalPostingSide[] = ["debit", "credit"];

export const readJournalPostingFormFields = ({
  formData,
  row,
  side,
}: {
  formData: FormData;
  row: number;
  side: JournalPostingSide;
}) => {
  const accountId = readTextFormField({ formData, key: `postings[${row}].${side}.accountId` });

  if (isNullish(accountId)) {
    return undefined;
  }

  const tokenSchema = createTokenSchema({
    decimals: readDecimalsFormField({ formData, key: `postings[${row}].decimals` }),
  });

  const amount = tokenSchema.parse(formData.get(`postings[${row}].amount`));

  return {
    accountId,
    description: readTextFormField({ formData, key: `postings[${row}].description` }),
    debit: side === "debit" ? amount : 0n,
    credit: side === "credit" ? amount : 0n,
    currency: formData.get(`postings[${row}].currency`),
    exchangeRate: formData.get(`postings[${row}].exchangeRate`),
  };
};

export const readJournalPostingsFormRows = <T>({
  formData,
  readPosting,
}: {
  formData: FormData;
  readPosting: (params: { formData: FormData; row: number; side: JournalPostingSide }) => T;
}): NonNullable<T>[] => {
  const rowCount = Number(formData.get("rowCount"));

  return Array.from({ length: rowCount }, (_, row) =>
    JOURNAL_POSTING_SIDES.map((side) => readPosting({ formData, row, side })),
  )
    .flat()
    .filter(nonNullish);
};

// A "manual" journal entry (not tight to an invoice) needs a reference or at least one posting with a description - enforced by the
// database, checked here to tell the user before submitting.
// Note: we do not assert for invoice reference because we are hiding the "update" option in the UI for journal
// that are linked with an invoice - i.e. user should practically not have access to the edit mask for such type of postings.
export const isJournalDescribed = ({ formData }: { formData: FormData }): boolean => {
  const rowCount = Number(formData.get("rowCount"));

  return (
    notEmptyString(readTextFormField({ formData, key: "reference" })) ||
    Array.from({ length: rowCount }, (_, row) =>
      readTextFormField({ formData, key: `postings[${row}].description` }),
    ).some(notEmptyString)
  );
};
