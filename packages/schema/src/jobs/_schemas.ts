import * as PdfInvoicesSchema from "./schemas/pdf-invoices";
import * as CommonSchema from "./schemas/common";
import * as MigrationsSchema from "./schemas/migrations";
import * as PdfCleanupSchema from "./schemas/pdf-cleanup";
import * as MailsSchema from "./schemas/mails";
import * as ExportsSchema from "./schemas/exports";

const JobsSchema = {
  PdfInvoicesSchema,
  MigrationsSchema,
  PdfCleanupSchema,
  MailsSchema,
  ExportsSchema,
  CommonSchema,
};

export { JobsSchema };
