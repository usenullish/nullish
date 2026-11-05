import { SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import type { Nullable, Option } from "@usenullish/nullish-common";
import type { PeriodBalance } from "../../_helpers/period-balances";
import { type AccountBalance, PeriodClosing, type PeriodClosingArgs } from "./_closing";

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];

type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

export class SoleProprietorshipClosing extends PeriodClosing {
  private constructor(args: PeriodClosingArgs) {
    super(args);
  }

  static create(args: PeriodClosingArgs): SoleProprietorshipClosing {
    return new this(args);
  }

  // For a sole proprietorship, on 31.12 nothing is earned or spent. 2850's and 2820's balances are just moved onto 2800.
  protected _buildTransfers({
    balances,
    systemAccounts,
  }: {
    balances: PeriodBalance[];
    systemAccounts: SystemAccountsByPurpose;
  }): Nullable<AccountBalance[]> {
    const { capital, capitalContributions, privateAccount } = this.#loadSystemAccounts({
      systemAccounts,
    });

    const transfers = [capitalContributions, privateAccount]
      .map(({ accountId }) => {
        const balance = balances.find((balance) => balance.accountId === accountId);

        return {
          accountId,
          balance: (balance?.credit ?? 0n) - (balance?.debit ?? 0n),
        };
      })
      .filter(({ balance }) => balance !== 0n);

    const total = transfers.reduce((total, { balance }) => total + balance, 0n);

    return [
      ...transfers,
      ...(total === 0n ? [] : [{ accountId: capital.accountId, balance: -total }]),
    ];
  }

  protected _buildOpeningBalances({
    systemAccounts,
    closingBalances,
  }: {
    closingBalances: AccountBalance[];
    systemAccounts: SystemAccountsByPurpose;
  }): AccountBalance[] {
    const { capital, capitalContributions, privateAccount, annualResult } =
      this.#loadSystemAccounts({
        systemAccounts,
      });

    const ownerAccountIds = [
      capital.accountId,
      capitalContributions.accountId,
      privateAccount.accountId,
      annualResult.accountId,
    ];

    const ownerBalances = closingBalances.filter(({ accountId }) =>
      ownerAccountIds.includes(accountId),
    );

    // The new year opens with all of the owner's equity summed on the capital: 2800 + 2820 + 2850 + 2891.
    const capitalBalance = ownerBalances.reduce((total, { balance }) => total + balance, 0n);

    return [
      ...closingBalances.filter(({ accountId }) => !ownerAccountIds.includes(accountId)),
      {
        accountId: capital.accountId,
        balance: capitalBalance,
      },
    ];
  }

  #loadSystemAccounts({ systemAccounts }: { systemAccounts: SystemAccountsByPurpose }): {
    capital: SystemAccount;
    capitalContributions: SystemAccount;
    privateAccount: SystemAccount;
    annualResult: SystemAccount;
  } {
    return {
      capital: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.CAPITAL,
      }),
      capitalContributions: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.CAPITAL_CONTRIBUTIONS,
      }),
      privateAccount: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.PRIVATE_ACCOUNT,
      }),
      annualResult: this._assertSystemAccount({
        systemAccounts,
        purpose: SystemAccountPurpose.ANNUAL_RESULT,
      }),
    };
  }
}
