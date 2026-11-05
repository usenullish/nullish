import { type DbUserContextArgs } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { getJournalEntry } from "../../_helpers/journal";
import { JournalContext } from "./_journal.context";
import { type JournalUpdate } from "./_journal.update";
import { JournalWithVatUpdate } from "./_journal-with-vat.update";
import { JournalWithoutVatUpdate } from "./_journal-without-vat.update";

type SelectJournal = Composites["Journal"]["Select"];
type UpdateJournal = Composites["Journal"]["Update"];

export type UpdateJournalServiceArgs = DbUserContextArgs & {
  journalId: SelectJournal["entry"]["id"];
};

export class UpdateJournalService extends JournalContext {
  readonly #journalId: SelectJournal["entry"]["id"];

  private constructor({ journalId, ...rest }: UpdateJournalServiceArgs) {
    super(rest);

    this.#journalId = journalId;
  }

  static create(args: UpdateJournalServiceArgs): UpdateJournalService {
    return new this(args);
  }

  update({ values }: { values: UpdateJournal }): Promise<Result<SelectJournal>> {
    return this._withViewRefresh(async () => {
      return await this.#update({ values });
    });
  }

  #update({ values }: { values: UpdateJournal }): Promise<Result<SelectJournal>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Load the organization ID and at the same time ensure the user has access to it
        const { organizationId } = await getJournalEntry({ tx, journalId: this.#journalId });

        const usedVatRates = await this._listUsedVatRatesWithGeneratedPostings({
          tx,
          organizationId,
          postings: values.postings,
        });

        const init = (): JournalUpdate => {
          switch (usedVatRates.type) {
            case "no-vat-rates":
            // "other-vat-rates" (e.g. only CEX or SPE) generates no VAT postings either, so it doesn't need the
            // VAT implementation: this spares loading the VAT methods and system accounts, and asserting them.
            case "other-vat-rates":
              return JournalWithoutVatUpdate.create({
                tx,
                journalId: this.#journalId,
              });
            case "vat-rates-with-generated-postings":
              return JournalWithVatUpdate.create({
                tx,
                journalId: this.#journalId,
                organizationId,
                rates: usedVatRates.rates,
              });
          }
        };

        const service = init();
        return await service.update({ values });
      });
    });
  }
}
