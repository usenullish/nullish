import * as InvoicesSchema from "./schemas/invoices";
import * as CamtSchema from "./schemas/camt";
import * as BankingSchema from "./schemas/banking";
import * as MigrationSchema from "./schemas/migration";
import * as ExportsSchema from "./schemas/exports";

const ServicesSchema = {
  InvoicesSchema,
  CamtSchema,
  BankingSchema,
  MigrationSchema,
  ExportsSchema,
};

export { ServicesSchema };
