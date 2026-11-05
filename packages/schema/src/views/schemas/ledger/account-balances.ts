import { createSelectSchema } from "drizzle-orm/zod";
import { AccountBalancesView } from "../../../db/views/ledger/account-balances";
import { refineBalances } from "./_balances";

export const SelectAccountBalancesView = createSelectSchema(AccountBalancesView, refineBalances);
