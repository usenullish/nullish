import {
  readAddressFormFields,
  readCommunicationFormFields,
  readTextFormField,
} from "~/context/form/_contact-details.form";

export const readClientFormFields = ({ formData }: { formData: FormData }) => ({
  type: formData.get("type"),
  name: formData.get("name"),
  vatNumber: readTextFormField({ formData, key: "vatNumber" }),
  ...readAddressFormFields({ formData }),
  ...readCommunicationFormFields({ formData }),
});
