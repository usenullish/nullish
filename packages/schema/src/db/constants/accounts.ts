export enum AccountType {
  ASSET = "asset", // DE: Aktiven, FR: actif
  LIABILITY = "liability", // DE: Fremdkapital, FR: capitaux étrangers --> passif
  EQUITY = "equity", // DE: Eigenkapital, FR: capitaux propres      --> passif
  INCOME = "income", // DE: Ertrag, FR: produits
  EXPENSE = "expense", // DE: Aufwand, FR: charges
  CLOSING = "closing", // DE: Abschluss, FR: clôture
}

export const BALANCE_SHEET_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.ASSET,
  AccountType.LIABILITY,
  AccountType.EQUITY,
];

export const INCOME_STATEMENT_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.INCOME,
  AccountType.EXPENSE,
];
