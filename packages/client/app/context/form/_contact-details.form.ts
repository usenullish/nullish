import { sanitizeEmptyString } from "@usenullish/nullish-common";

export const readTextFormField = ({ formData, key }: { formData: FormData; key: string }) =>
  sanitizeEmptyString(formData.get(key)?.toString()) ?? null;

export const readAddressFormFields = ({ formData }: { formData: FormData }) => {
  const text = (key: string) => readTextFormField({ formData, key });

  return {
    careOf: text("careOf"),
    address: text("address"),
    postalCode: text("postalCode"),
    city: text("city"),
    country: text("country")?.toUpperCase() ?? null,
  };
};

export const readCommunicationFormFields = ({ formData }: { formData: FormData }) => {
  const text = (key: string) => readTextFormField({ formData, key });

  return {
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    language: text("language"),
  };
};
