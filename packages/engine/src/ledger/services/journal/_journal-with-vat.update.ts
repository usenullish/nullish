import { type Composites } from "@usenullish/nullish-schema/composites";
import { type VatRates } from "./_journal";
import { JournalUpdate, type JournalUpdateArgs } from "./_journal.update";

type SelectJournal = Composites["Journal"]["Select"];
type UpdateJournal = Composites["Journal"]["Update"];

type JournalWithVatUpdateArgs = JournalUpdateArgs & {
  organizationId: SelectJournal["entry"]["organizationId"];
  rates: VatRates;
};

export class JournalWithVatUpdate extends JournalUpdate {
  readonly #organizationId: SelectJournal["entry"]["organizationId"];
  readonly #rates: VatRates;

  private constructor({ organizationId, rates, ...rest }: JournalWithVatUpdateArgs) {
    super(rest);

    this.#organizationId = organizationId;
    this.#rates = rates;
  }

  static create(args: JournalWithVatUpdateArgs): JournalWithVatUpdate {
    return new this(args);
  }

  async update({ values }: { values: UpdateJournal }): Promise<SelectJournal> {
    // 2. Load and assert the VAT (similar as the _journal-with-vat.create)
    const vat = await this._loadAndAssertVat({
      organizationId: this.#organizationId,
      validOn: values.entry.validOn,
      rates: this.#rates,
    });

    const journal = await this._updateJournal({ values });

    // 5. Generate and insert the VAT postings and the relations (same as in create)
    const vatPostings = await this._insertVatPostings({ journal, vat });

    return { ...journal, postings: [...journal.postings, ...vatPostings] };
  }
}
