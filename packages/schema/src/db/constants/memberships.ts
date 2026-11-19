export enum MembershipRole {
  ADMIN = "admin", // full access: bookkeeping + organization/user administration
  ACCOUNTANT = "accountant", // full bookkeeping access (accounts, journal, periods, VAT), no org/user administration
  REVIEWER = "reviewer", // read-only access
}
