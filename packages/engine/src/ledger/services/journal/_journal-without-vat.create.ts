import { type Composites } from "@usenullish/nullish-schema/composites";
import { type CreateJournalValues, JournalCreate, type JournalCreateArgs } from "./_journal.create";

type SelectJournal = Composites["Journal"]["Select"];

export class JournalWithoutVatCreate extends JournalCreate {
  private constructor(args: JournalCreateArgs) {
    super(args);
  }

  static create(args: JournalCreateArgs): JournalWithoutVatCreate {
    return new this(args);
  }

  async create({ values }: { values: CreateJournalValues }): Promise<SelectJournal> {
    return await this._insertJournal({ values });
  }
}
