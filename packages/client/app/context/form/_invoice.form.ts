import { emptyStringToNull } from "@usenullish/nullish-common";
import * as z from "zod";

export const InvoiceFormFieldsSchema = z.strictObject({
  issueOn: z.coerce.date(),
  dueOn: emptyStringToNull(z.coerce.date().nullable()),
  exchangeRate: z.coerce.number(),
  vatRateId: emptyStringToNull(z.uuid().nullable()),
});

export const readInvoiceFormFields = ({ formData }: { formData: FormData }) => ({
  clientId: formData.get("clientId"),
  issueOn: formData.get("issueOn"),
  dueOn: formData.get("dueOn"),
  exchangeRate: formData.get("exchangeRate"),
  currency: formData.get("currency"),
  vatRateId: formData.get("vatRateId"),
});
