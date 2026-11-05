import * as z from "zod";

const DecimalsSchema = z.string().regex(/^\d+$/).transform(Number);

export const readDecimalsFormField = ({ formData, key }: { formData: FormData; key: string }) =>
  DecimalsSchema.parse(formData.get(key));
