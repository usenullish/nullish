export const formatIban = (iban: string): string =>
  iban.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
