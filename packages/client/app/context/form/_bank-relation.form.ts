import { readTextFormField } from "~/context/form/_contact-details.form";

const normalizeIban = (iban: FormDataEntryValue | null) =>
  typeof iban === "string" ? iban.replace(/\s/g, "").toUpperCase() : iban;

export const readBankRelationFormFields = ({ formData }: { formData: FormData }) => ({
  name: formData.get("name"),
  iban: normalizeIban(formData.get("iban")),
  invoiceIban: normalizeIban(readTextFormField({ formData, key: "invoiceIban" })),
  currency: formData.get("currency"),
  accountId: formData.get("accountId"),
});
