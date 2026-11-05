import type { Api } from "@usenullish/nullish-schema/server";

export type JournalEntry = Pick<
  Api["JournalSummaries"]["Client"]["JournalSummary"],
  "entry" | "postings" | "vatPostings"
>;

export type Posting = JournalEntry["postings"][number];

export interface JournalLinePostings {
  debit?: Posting;
  credit?: Posting;
}

export class JournalLines {
  readonly #postings: Posting[];

  private constructor({ journalEntry: { postings, vatPostings } }: { journalEntry: JournalEntry }) {
    this.#postings = postings.filter(
      ({ id }) => !vatPostings.some(({ vatPostingId }) => vatPostingId === id),
    );
  }

  static create(args: { journalEntry: JournalEntry }): JournalLines {
    return new this(args);
  }

  // In the form a line is "debit account / credit account / amount", but in the database the postings
  // are stored one by one. So to display the form we have to rebuild the lines: each debit is paired with
  // a credit of the same amount, currency, exchange rate and description.
  // For example:
  // - postings: 4400 debit 108.10 and 1020 credit 108.10
  // - line: 4400 / 1020 108.10
  // The credits that do not match any debit are displayed as lines with only a credit account.
  pair(): JournalLinePostings[] {
    const debits = this.#postings.filter(({ debit }) => debit > 0n);
    const credits = this.#postings.filter(({ debit }) => debit === 0n);

    const { paired, unpaired } = debits.reduce<{
      paired: JournalLinePostings[];
      unpaired: Posting[];
    }>(
      ({ paired, unpaired }, debit) => {
        const credit = unpaired.find(
          (posting) =>
            posting.credit === debit.debit &&
            posting.currency === debit.currency &&
            posting.exchangeRate === debit.exchangeRate &&
            posting.description === debit.description,
        );

        return {
          paired: [...paired, { debit, credit }],
          unpaired: unpaired.filter((posting) => posting !== credit),
        };
      },
      { paired: [], unpaired: credits },
    );

    return [...paired, ...unpaired.map((credit) => ({ credit }))];
  }
}
