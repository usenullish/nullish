import { readTextFormField } from "~/context/form/_contact-details.form";

export const readAccountFormFields = ({ formData }: { formData: FormData }) => ({
  code: formData.get("code"),
  name: readTextFormField({ formData, key: "name" }),
  type: formData.get("type"),
  parentId: readTextFormField({ formData, key: "parentId" }),
});
