import { CoreSchema } from "./_schema";
import { LegalForm } from "../../constants/organizations";

export const legalForm = CoreSchema.enum("legal_form", LegalForm);
