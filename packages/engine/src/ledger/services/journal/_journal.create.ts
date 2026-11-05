import { type Tx } from "@usenullish/nullish-db";
import { type Composites } from "@usenullish/nullish-schema/composites";
import { type Records } from "@usenullish/nullish-schema/records";
import { insertJournal } from "../../_helpers/journal";
import { JournalOperation } from "./_journal";

type Organization = Records["Core"]["Organizations"]["Select"];

type SelectJournal = Composites["Journal"]["Select"];

export interface CreateJournalValues {
  entry: Composites["Journal"]["Insert"]["entry"];
  postings: Omit<Records["Ledger"]["Postings"]["Insert"], "journalEntryId">[];
}

export interface JournalCreateArgs {
  tx: Tx;
  organizationId: Organization["id"];
}

export abstract class JournalCreate extends JournalOperation {
  protected readonly _organizationId: Organization["id"];

  protected constructor({ organizationId, ...rest }: JournalCreateArgs) {
    super(rest);

    this._organizationId = organizationId;
  }

  abstract create({ values }: { values: CreateJournalValues }): Promise<SelectJournal>;

  protected async _insertJournal({
    values: { entry, postings },
  }: {
    values: CreateJournalValues;
  }): Promise<SelectJournal> {
    return await insertJournal({
      tx: this._tx,
      values: {
        entry: { ...entry, organizationId: this._organizationId },
        postings,
      },
    });
  }
}
