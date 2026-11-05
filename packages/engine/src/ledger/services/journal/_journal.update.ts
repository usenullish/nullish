import { type Tx } from "@usenullish/nullish-db";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { updateJournal } from "../../_helpers/journal";
import { deleteJournalVatPostings } from "../../_helpers/journal-vat";
import { JournalOperation } from "./_journal";

type SelectJournal = Composites["Journal"]["Select"];
type UpdateJournal = Composites["Journal"]["Update"];

export interface JournalUpdateArgs {
  tx: Tx;
  journalId: SelectJournal["entry"]["id"];
}

export abstract class JournalUpdate extends JournalOperation {
  protected readonly _journalId: SelectJournal["entry"]["id"];

  protected constructor({ journalId, ...rest }: JournalUpdateArgs) {
    super(rest);

    this._journalId = journalId;
  }

  abstract update({ values }: { values: UpdateJournal }): Promise<SelectJournal>;

  protected async _updateJournal({
    values: { entry, postings },
  }: {
    values: UpdateJournal;
  }): Promise<SelectJournal> {
    // 3. We delete the VAT postings and the relations by cascade.
    // Technically we could search what to update and what to delete but, the update,
    // would be quite a reconciliation process (there are several derived data that could change).
    // Therefore, deleting is the simplest solution but, also the one that ensure better quality.
    const vatPostingIds = await deleteJournalVatPostings({
      tx: this._tx,
      journalEntryId: this._journalId,
    });

    // 4. Update the journal entry and the postings (that were not VAT generated postings which
    // we deleted in previous step).
    const nonVatPostings = postings.filter(
      (posting) => !("id" in posting) || !vatPostingIds.includes(posting.id),
    );

    return await updateJournal({
      tx: this._tx,
      journalId: this._journalId,
      values: {
        entry,
        postings: nonVatPostings,
      },
    });
  }
}
