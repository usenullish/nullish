import { type Composites } from "@usenullish/nullish-schema/composites";
import { JournalUpdate, type JournalUpdateArgs } from "./_journal.update";

type SelectJournal = Composites["Journal"]["Select"];
type UpdateJournal = Composites["Journal"]["Update"];

export class JournalWithoutVatUpdate extends JournalUpdate {
  private constructor(args: JournalUpdateArgs) {
    super(args);
  }

  static create(args: JournalUpdateArgs): JournalWithoutVatUpdate {
    return new this(args);
  }

  async update({ values }: { values: UpdateJournal }): Promise<SelectJournal> {
    return await this._updateJournal({ values });
  }
}
