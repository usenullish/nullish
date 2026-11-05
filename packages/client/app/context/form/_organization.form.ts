import {
  readAddressFormFields,
  readCommunicationFormFields,
} from "~/context/form/_contact-details.form";

export const readOrganizationFormFields = ({ formData }: { formData: FormData }) => ({
  name: formData.get("name"),
  ...readAddressFormFields({ formData }),
  ...readCommunicationFormFields({ formData }),
});
