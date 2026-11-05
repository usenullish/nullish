export const QUANTITY_DECIMALS = 3;

export enum InvoiceStatus {
  DRAFT = "draft",
  OPEN = "open",
  PAID = "paid",
  UNCOLLECTIBLE = "uncollectible",
  VOID = "void",
}

export enum InvoiceLineType {
  ITEM = "item",
  DISCOUNT = "discount",
}
