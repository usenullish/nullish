import * as PdfInvoicesSchema from "./schemas/pdf-invoices";
import * as CommonSchema from "./schemas/common";
import * as MigrationsSchema from "./schemas/migrations";
import * as PdfCleanupSchema from "./schemas/pdf-cleanup";

const JobsSchema = {
  PdfInvoicesSchema,
  MigrationsSchema,
  PdfCleanupSchema,
  CommonSchema,
};

export { JobsSchema };
