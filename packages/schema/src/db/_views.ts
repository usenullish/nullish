import * as OrganizationMembersView from "./views/core/organization-members";
import * as AccountBalancesView from "./views/ledger/account-balances";
import * as BalanceSheetView from "./views/ledger/balance-sheet";
import * as IncomeStatementView from "./views/ledger/income-statement";

const DbView = {
  Core: {
    OrganizationMembers: OrganizationMembersView,
  },
  Ledger: {
    AccountBalances: AccountBalancesView,
    BalanceSheet: BalanceSheetView,
    IncomeStatement: IncomeStatementView,
  },
};

export { DbView };
