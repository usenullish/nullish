import * as OrganizationMembersView from "./schemas/core/organization-members";
import * as AccountBalancesView from "./schemas/ledger/account-balances";
import * as BalanceSheetView from "./schemas/ledger/balance-sheet";
import * as IncomeStatementView from "./schemas/ledger/income-statement";

const ViewsSchema = {
  Core: {
    OrganizationMembersView,
  },
  Ledger: {
    AccountBalancesView,
    BalanceSheetView,
    IncomeStatementView,
  },
};

export { ViewsSchema };
