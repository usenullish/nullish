// Similarly to Bexio we need system account to automate tasks
// https://help.bexio.com/s/article/000001776?language=en_US

export enum SystemAccountPurpose {
  // --- Banking, Receivables & Payables ---
  BANK_ACCOUNT = "bank_account", // 1020 (BANK)
  DEBTOR = "debtor", // 1100 (DEBTOR)
  CREDITOR = "creditor", // 2300 (CREDITOR)
  CUSTOMER_CREDIT_BALANCE = "customer_credit_balance", // 2030 (CUSTOMER_CREDIT_BALANCE)

  // --- Operational Revenues & Expenses ---
  DEFAULT_INCOME = "default_income", // 3400 (DEFAULT_INCOME)
  DEFAULT_EXPENSE = "default_expense", // 4200 (DEFAULT_EXPENSE)
  INCOME_REDUCTION = "income_reduction", // 3800 (INCOME_REDUCTION)
  BAD_DEBTS = "bad_debts", // 3805
  EXPENSE_REDUCTION = "expense_reduction", // 4900 (EXPENSE_REDUCTION)

  // --- VAT Accounts ---
  VAT_TAX_DUE = "vat_tax_due", // 2200 (TAX_SALES)
  SETTLEMENT_ACCOUNT_VAT = "settlement_account_vat", // 2201 (SETTLEMENT_ACCOUNT_VAT)
  VAT_REMUNERATION_RECEIVED = "vat_remuneration_received", // 2202 (TRANSITORY_TAX_ACCOUNT_SALES)
  REGARDS_TAX = "regards_tax", // 2203 (REGARDS_TAX)
  TAX_PRE_MATERIAL = "tax_pre_material", // 1170 (TAX_PRE_MATERIAL)
  TAX_PRE_INVESTMENT = "tax_pre_investment", // 1171 (TAX_PRE_INVESTMENT)
  TRANSITORY_TAX_ACCOUNT_PRE = "transitory_tax_account_pre", // 1172 (TRANSITORY_TAX_ACCOUNT_PRE)
  TAX_PRE_TAX_CUTS = "tax_pre_tax_cuts", // 1173 (TAX_PRE_TAX_CUTS)
  TAX_PRE_TAX_CORRECTION = "tax_pre_tax_correction", // 1174 (TAX_PRE_TAX_CORRECTION)

  // --- Financial, Rounding & Exchange Rates ---
  ROUNDING_DIFFERENCES = "rounding_differences", // 6945 (TAX_ROUNDING_DIFFS)
  EXCHANGE_RATE_LOSSES = "exchange_rate_losses", // 6949 (CURRENCY_EXPENSE)
  EXCHANGE_RATE_GAINS = "exchange_rate_gains", // 6999 (CURRENCY_INCOME)

  // --- Period Closing & Balance Sheet ---
  PROFIT_AND_LOSS = "profit_and_loss", // 9000 (PROFIT_AND_LOSS)
  OPENING_BALANCE_SHEET = "opening_balance_sheet", // 9100 (OPENING_BALANCE_SHEET)
  CLOSING_BALANCE_SHEET = "closing_balance_sheet", // 9101 (CLOSING_BALANCE_SHEET)
  ANNUAL_PROFIT = "annual_profit", // 9200 (ANNUAL_PROFIT)
  ANNUAL_RESULT = "annual_result", // 2979, 2891 for a sole proprietorship (einzelunternehmen)
  CORRECTION = "correction", // 9900 (CORRECTION)
  BALANCE_TAKEOVER = "balance_takeover", // 9901 (BALANCE_TAKEOVER)

  // --- Equity ---
  CAPITAL = "capital", // 2800 (used for sole proprietorship, only for consistency for llc and corporation)

  // --- Equity - Owner's equity of a sole proprietorship (einzelunternehmen) only ---
  CAPITAL_CONTRIBUTIONS = "capital_contributions", // 2820
  PRIVATE_ACCOUNT = "private_account", // 2850
}
