import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { deleteMany, insertMany, selectMany } from "@usenullish/nullish-db";
import { DbSchema, VAT_TYPES_WITH_GENERATED_POSTINGS } from "@usenullish/nullish-schema/db";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, inArray } from "drizzle-orm";

type Journal = Composites["Journal"]["Select"];
type Posting = Journal["postings"][number];

type VatRate = Records["Core"]["VatRates"]["Select"];

export const deleteJournalVatPostings = async ({
  tx,
  journalEntryId,
}: {
  tx: Tx;
  journalEntryId: Posting["journalEntryId"];
}): Promise<Posting["id"][]> => {
  const deleted = await deleteMany({
    tx,
    table: DbSchema.Ledger.Journal.PostingsSchema,
    returningSchema: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema,
    where: inArray(
      DbSchema.Ledger.Journal.PostingsSchema.id,
      tx
        .select({
          id: DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema.vatPostingId,
        })
        .from(DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema)
        .where(
          inArray(
            DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema.postingId,
            tx
              .select({ id: DbSchema.Ledger.Journal.PostingsSchema.id })
              .from(DbSchema.Ledger.Journal.PostingsSchema)
              .where(eq(DbSchema.Ledger.Journal.PostingsSchema.journalEntryId, journalEntryId)),
          ),
        ),
    ),
  });

  return deleted.map(({ id }) => id);
};

export interface PreparedVatPosting {
  postingId: Posting["id"];
  vatPosting: Pick<
    Posting,
    "accountId" | "description" | "debit" | "credit" | "currency" | "exchangeRate" | "vatRateId"
  >;
}

export interface InsertedVatPosting {
  postingId: Posting["id"];
  vatPosting: Posting;
}

export const insertVatPostings = async ({
  tx,
  entry,
  preparedVatPostings,
}: {
  tx: Tx;
  entry: Journal["entry"];
  preparedVatPostings: PreparedVatPosting[];
}): Promise<InsertedVatPosting[]> =>
  await Promise.all(
    preparedVatPostings.map(async ({ postingId, vatPosting }) => {
      const inserted = await insertMany({
        tx,
        table: DbSchema.Ledger.Journal.PostingsSchema,
        values: {
          ...vatPosting,
          organizationId: entry.organizationId,
          journalEntryId: entry.id,
        },
        returningSchema: RecordsSchema.Ledger.PostingsSchema.SelectPostingsSchema,
      });

      assertArrayExactlyOne(inserted);

      const [row] = inserted;
      return { postingId, vatPosting: row };
    }),
  );

export const insertPostingManualVatPostings = async ({
  tx,
  organizationId,
  insertedVatPostings,
}: {
  tx: Tx;
  organizationId: Journal["entry"]["organizationId"];
  insertedVatPostings: InsertedVatPosting[];
}): Promise<void> => {
  await Promise.all(
    insertedVatPostings.map(({ postingId, vatPosting: { id: vatPostingId } }) =>
      insertMany({
        tx,
        table: DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema,
        values: { organizationId, postingId, vatPostingId },
        returningSchema:
          RecordsSchema.Ledger.PostingManualVatPostingsSchema.SelectPostingManualVatPostingsSchema,
      }),
    ),
  );
};

export const listVatRatesWithGeneratedPostings = async ({
  tx,
  organizationId,
  vatRateIds,
}: {
  tx: Tx;
  organizationId: VatRate["organizationId"];
  vatRateIds: [VatRate["id"], ...VatRate["id"][]];
}): Promise<VatRate[]> =>
  await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatRatesSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatRatesSchema.organizationId, organizationId),
      inArray(DbSchema.Core.Vat.VatRatesSchema.id, vatRateIds),
      inArray(DbSchema.Core.Vat.VatRatesSchema.type, VAT_TYPES_WITH_GENERATED_POSTINGS),
    ),
  });
