import { type DbUserContextArgs, type Tx } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { type Records } from "@usenullish/nullish-schema/records";
import { JournalContext } from "./_journal.context";
import { type CreateJournalValues } from "./_journal.create";
import { JournalWithVatCreate } from "./_journal-with-vat.create";
import { JournalWithoutVatCreate } from "./_journal-without-vat.create";
import { JournalCreate } from "./_journal.create";

type Organization = Records["Core"]["Organizations"]["Select"];

type SelectJournal = Composites["Journal"]["Select"];

export type CreateJournalServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
};

export class CreateJournalService extends JournalContext {
  readonly #organizationId: Organization["id"];

  private constructor({ organizationId, ...rest }: CreateJournalServiceArgs) {
    super(rest);

    this.#organizationId = organizationId;
  }

  static create(args: CreateJournalServiceArgs): CreateJournalService {
    return new this(args);
  }

  create({ values }: { values: CreateJournalValues }): Promise<Result<SelectJournal>> {
    const create = async () => {
      return tryCatch(async () => {
        return await this._withAuth(async (tx) => {
          return await this.#create({ values, tx });
        });
      });
    };

    return this._withViewRefresh(async () => {
      return await create();
    });
  }

  // TODO: not convinced by this pattern of exposing a service to another service to a badly named method
  // Maybe we should extract helpers, or abstract class (did not seemed possible) or find a better pattern
  __createInTx__(args: { values: CreateJournalValues; tx: Tx }): Promise<SelectJournal> {
    return this.#create(args);
  }

  async #create({ values, tx }: { values: CreateJournalValues; tx: Tx }): Promise<SelectJournal> {
    const usedVatRates = await this._listUsedVatRatesWithGeneratedPostings({
      tx,
      organizationId: this.#organizationId,
      postings: values.postings,
    });

    const init = (): JournalCreate => {
      switch (usedVatRates.type) {
        case "no-vat-rates":
        // "other-vat-rates" (e.g. only CEX or SPE) generates no VAT postings either, so it doesn't need the
        // VAT implementation: this spares loading the VAT methods and system accounts, and asserting them.
        case "other-vat-rates":
          return JournalWithoutVatCreate.create({
            tx,
            organizationId: this.#organizationId,
          });
        case "vat-rates-with-generated-postings":
          return JournalWithVatCreate.create({
            tx,
            organizationId: this.#organizationId,
            rates: usedVatRates.rates,
          });
      }
    };

    const service = init();
    return await service.create({ values });
  }
}
