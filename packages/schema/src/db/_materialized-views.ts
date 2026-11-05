import * as AccountBalancesMaterializedView from "./materialized-views/ledger/account-balances";

const DbMaterializedView = {
  Ledger: {
    AccountBalances: AccountBalancesMaterializedView,
  },
};

export { DbMaterializedView };
