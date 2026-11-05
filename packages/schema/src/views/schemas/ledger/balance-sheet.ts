import { createSelectSchema } from "drizzle-orm/zod";
import { BalanceSheetView } from "../../../db/views/ledger/balance-sheet";
import { refineBalances } from "./_balances";

export const SelectBalanceSheetView = createSelectSchema(BalanceSheetView, refineBalances);
