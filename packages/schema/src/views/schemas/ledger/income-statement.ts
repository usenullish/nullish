import { createSelectSchema } from "drizzle-orm/zod";
import { IncomeStatementView } from "../../../db/views/ledger/income-statement";
import { refineBalances } from "./_balances";

export const SelectIncomeStatementView = createSelectSchema(IncomeStatementView, refineBalances);
