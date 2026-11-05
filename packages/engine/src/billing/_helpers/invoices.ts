import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { selectMany, updateMany } from "@usenullish/nullish-db";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import {
  assertArrayAtMostOne,
  assertArrayExactlyOne,
  isNullish,
  nonNullish,
  type Option,
} from "@usenullish/nullish-common";
import type { LockStrength } from "drizzle-orm/pg-core";

type SelectInvoice = Records["Billing"]["Invoices"]["Select"];
type UpdateInvoice = Records["Billing"]["Invoices"]["Update"];
type FilterInvoices = Records["Billing"]["Invoices"]["Filter"];

export const buildInvoicesWhere = ({
  status,
  clientId,
  issueOnFrom,
  issueOnTo,
}: FilterInvoices): Option<SQL> => {
  const invoices = DbSchema.Billing.Invoices.InvoicesSchema;

  return and(
    nonNullish(status) ? eq(invoices.status, status) : undefined,
    nonNullish(clientId) ? eq(invoices.clientId, clientId) : undefined,
    nonNullish(issueOnFrom) ? gte(invoices.issueOn, issueOnFrom) : undefined,
    nonNullish(issueOnTo) ? lte(invoices.issueOn, issueOnTo) : undefined,
  );
};

export const findInvoiceById = async ({
  tx,
  id,
}: {
  tx: Tx;
  id: SelectInvoice["id"];
}): Promise<Option<SelectInvoice>> => {
  const invoices = await selectMany({
    tx,
    table: DbSchema.Billing.Invoices.InvoicesSchema,
    schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    where: eq(DbSchema.Billing.Invoices.InvoicesSchema.id, id),
  });

  assertArrayAtMostOne(invoices);

  const [invoice] = invoices;
  return invoice;
};

export const listInvoices = async ({
  tx,
  organizationId,
  filters,
  ...queryArgs
}: {
  tx: Tx;
  organizationId: SelectInvoice["organizationId"];
  filters: Option<FilterInvoices>;
} & Required<SelectManyFilterArgs>): Promise<SelectInvoice[]> =>
  await selectMany({
    tx,
    table: DbSchema.Billing.Invoices.InvoicesSchema,
    schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    where: and(
      eq(DbSchema.Billing.Invoices.InvoicesSchema.organizationId, organizationId),
      isNullish(filters) ? undefined : buildInvoicesWhere(filters),
    ),
    ...queryArgs,
  });

export const getInvoice = async ({
  tx,
  id: invoiceId,
  lock,
}: {
  tx: Tx;
  id: SelectInvoice["id"];
  lock?: LockStrength;
}): Promise<SelectInvoice> => {
  const invoices = await selectMany({
    tx,
    table: DbSchema.Billing.Invoices.InvoicesSchema,
    schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    where: eq(DbSchema.Billing.Invoices.InvoicesSchema.id, invoiceId),
    lock,
  });

  assertArrayExactlyOne(invoices);

  const [invoice] = invoices;
  return invoice;
};

export const updateInvoice = async ({
  tx,
  invoiceId,
  values,
}: {
  tx: Tx;
  invoiceId: SelectInvoice["id"];
  values: Partial<UpdateInvoice>;
}): Promise<SelectInvoice> => {
  const openedInvoices = await updateMany<SelectInvoice, Db["Billing"]["Invoices"]>({
    tx,
    table: DbSchema.Billing.Invoices.InvoicesSchema,
    values,
    returningSchema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    where: eq(DbSchema.Billing.Invoices.InvoicesSchema.id, invoiceId),
  });

  assertArrayExactlyOne(openedInvoices);

  const [updatedInvoice] = openedInvoices;
  return updatedInvoice;
};

export const listInvoicesByPaymentReferences = async ({
  tx,
  organizationId,
  paymentReferences,
  statuses,
}: {
  tx: Tx;
  organizationId: SelectInvoice["organizationId"];
  paymentReferences: [
    NonNullable<SelectInvoice["paymentReference"]>,
    ...NonNullable<SelectInvoice["paymentReference"]>[],
  ];
  statuses: [SelectInvoice["status"], ...SelectInvoice["status"][]];
}): Promise<SelectInvoice[]> =>
  await selectMany({
    tx,
    table: DbSchema.Billing.Invoices.InvoicesSchema,
    schema: RecordsSchema.Billing.InvoicesSchema.SelectInvoicesSchema,
    where: and(
      eq(DbSchema.Billing.Invoices.InvoicesSchema.organizationId, organizationId),
      inArray(DbSchema.Billing.Invoices.InvoicesSchema.status, statuses),
      inArray(DbSchema.Billing.Invoices.InvoicesSchema.paymentReference, paymentReferences),
    ),
  });
