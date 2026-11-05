import { type Composites } from "@usenullish/nullish-schema/composites";
import { type VatRates } from "./_journal";
import { type CreateJournalValues, JournalCreate, type JournalCreateArgs } from "./_journal.create";

type SelectJournal = Composites["Journal"]["Select"];

export class JournalWithVatCreate extends JournalCreate {
  readonly #rates: VatRates;

  private constructor({ rates, ...rest }: JournalCreateArgs & { rates: VatRates }) {
    super(rest);

    this.#rates = rates;
  }

  static create(args: JournalCreateArgs & { rates: VatRates }): JournalWithVatCreate {
    return new this(args);
  }

  async create({ values }: { values: CreateJournalValues }): Promise<SelectJournal> {
    // 1. Load and assert the VAT methods in regards of the postings
    const vat = await this._loadAndAssertVat({
      organizationId: this._organizationId,
      validOn: values.entry.validOn,
      rates: this.#rates,
    });

    // 2. Insert the journal as submitted this way we can get the IDs of the inserted related postings
    const journal = await this._insertJournal({ values });

    // 3. Generate and insert the VAT postings and the relations
    const vatPostings = await this._insertVatPostings({ journal, vat });

    return { ...journal, postings: [...journal.postings, ...vatPostings] };
  }
}
