import { type AccountBalance, PeriodClosing, type PeriodClosingArgs } from "./_closing";
import type { Nullable } from "@usenullish/nullish-common";

export class CompanyClosing extends PeriodClosing {
  private constructor(args: PeriodClosingArgs) {
    super(args);
  }

  static create(args: PeriodClosingArgs): CompanyClosing {
    return new this(args);
  }

  protected _buildTransfers(): Nullable<AccountBalance[]> {
    return null;
  }

  protected _buildOpeningBalances({
    closingBalances: openingBalances,
  }: {
    closingBalances: AccountBalance[];
  }): AccountBalance[] {
    return openingBalances;
  }
}
